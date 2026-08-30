

globalThis.PF = globalThis.PF || {};

(function (PF) {
  "use strict";

  const D = PF.data;
  const MATERIALS = D.MATERIALS;
  const M = MATERIALS.length;

  const MAT_INDEX = {};
  MATERIALS.forEach((mat, i) => { MAT_INDEX[mat] = i; });

  /* ---------------------------------------------------------------- *
   *  Matrix construction                                             *
   * ---------------------------------------------------------------- */

  function buildMatrix(columns) {
    const n = columns.length;
    const A = new Float64Array(M * n);
    columns.forEach((col, j) => {
      const value = col.cost * col.factor;
      col.mats.forEach((mat) => {
        const i = MAT_INDEX[mat];
        if (i === undefined) throw new Error(`Unknown material "${mat}" in piece "${col.name}"`);
        A[j * M + i] = value;
      });
    });
    return A;
  }

  function standardColumns(levels, amount) {
    const columns = [];
    const groups  = [];

    levels.forEach((lvl) => {
      const levelDict = D.CRAFT_COSTS[lvl];
      if (!levelDict) return;
      const start  = columns.length;
      const factor = Math.pow(4, D.RARITY_BY_LEVEL[lvl] || 0);

      Object.keys(levelDict).forEach((name) => {
        const [mats, cost] = levelDict[name];
        columns.push({ level: lvl, name, mats: mats.slice(), cost, factor });
      });

      groups.push({ level: lvl, start, end: columns.length, N: amount });
    });

    return { columns, groups };
  }


  function customColumns(pieces, rarity, amount) {
    const factor  = Math.pow(4, rarity);
    const columns = pieces.map((p) => ({
      level:  "custom",
      name:   p.name,
      set:    p.set || "",
      slot:   p.slot || "",
      mats:   p.knownMats.slice(),
      cost:   p.cost,
      factor,
      extras: (p.extras || []).map((e) => ({ mat: e.mat, cost: e.cost }))
    }));
    const groups = [{ level: "custom", start: 0, end: columns.length, N: amount }];
    return { columns, groups, factor };
  }

  /* ---------------------------------------------------------------- *
   *  Rounding, usage, repair                                         *
   * ---------------------------------------------------------------- */

  function computeUsage(A, n, x) {
    const usage = new Float64Array(M);
    for (let j = 0; j < n; j++) {
      const xj = x[j];
      if (xj === 0) continue;
      const off = j * M;
      for (let i = 0; i < M; i++) usage[i] += A[off + i] * xj;
    }
    return usage;
  }

  function roundPreserveTotals(x, groups) {
    const out = new Int32Array(x.length);

    groups.forEach((grp) => {
      let sum = 0;
      const frac = [];
      for (let j = grp.start; j < grp.end; j++) {
        const floored = Math.floor(x[j] + 1e-9);
        out[j] = floored;
        sum += floored;
        frac.push({ j, f: x[j] - floored });
      }

      let deficit = grp.N - sum;
      if (deficit > 0) {
        frac.sort((a, b) => b.f - a.f);
        for (let i = 0; i < deficit && i < frac.length; i++) out[frac[i].j] += 1;
      } else if (deficit < 0) {
        frac.sort((a, b) => a.f - b.f);
        let excess = -deficit;
        for (let i = 0; i < frac.length && excess > 0; i++) {
          const take = Math.min(out[frac[i].j], excess);
          out[frac[i].j] -= take;
          excess -= take;
        }
      }
    });

    return out;
  }

  function totalOverage(usage, budget) {
    let total = 0;
    for (let i = 0; i < M; i++) {
      const over = usage[i] - budget[i];
      if (over > 0) total += over;
    }
    return total;
  }


  function refineCounts(A, n, groups, xInt, budget) {
    let usage = computeUsage(A, n, xInt);
    const maxIters = 1000;
    let iters = 0;

    while (totalOverage(usage, budget) > 0 && iters < maxIters) {
      iters++;

      let matIdx = 0;
      let worst  = -Infinity;
      for (let i = 0; i < M; i++) {
        const over = usage[i] - budget[i];
        if (over > worst) { worst = over; matIdx = i; }
      }

      let best = null;
      groups.forEach((grp) => {
        for (let j = grp.start; j < grp.end; j++) {
          if (xInt[j] <= 0 || A[j * M + matIdx] <= 0) continue;
          for (let k = grp.start; k < grp.end; k++) {
            if (k === j || A[k * M + matIdx] !== 0) continue;

            let score = 0;
            for (let i = 0; i < M; i++) {
              const after = usage[i] - A[j * M + i] + A[k * M + i];
              if (after > budget[i]) score += after - budget[i];
            }
            if (best === null || score < best.score) best = { j, k, score };
          }
        }
      });

      if (best === null || best.score >= totalOverage(usage, budget)) break;

      xInt[best.j] -= 1;
      xInt[best.k] += 1;
      usage = computeUsage(A, n, xInt);
    }

    return usage;
  }

  /* ---------------------------------------------------------------- *
   *  Integer polish                                                  *
   * ---------------------------------------------------------------- */

  function spread(r) {
    let mean = 0;
    for (let i = 0; i < M; i++) mean += r[i];
    mean /= M;
    let total = 0;
    for (let i = 0; i < M; i++) {
      const d = r[i] - mean;
      total += d * d;
    }
    return total;
  }


  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  function polishCounts(A, n, groups, xInt, budget, maxPasses, budgetMs) {
    const r = new Float64Array(M);
    const usage = computeUsage(A, n, xInt);
    for (let i = 0; i < M; i++) r[i] = budget[i] - usage[i];


    const deadline = now() + (budgetMs || 400);

    const d    = new Float64Array(M);
    const v    = new Float64Array(M);
    const u    = new Float64Array(M);
    const cand = new Float64Array(M);

    let best = spread(r);

    let timedOut = false;

    for (let pass = 0; pass < maxPasses && !timedOut; pass++) {
      let move = null;
      let moveVal = best;

      let rMean = 0;
      for (let i = 0; i < M; i++) rMean += r[i];
      rMean /= M;
      for (let i = 0; i < M; i++) u[i] = r[i] - rMean;

      for (let g = 0; g < groups.length && !timedOut; g++) {
        const grp = groups[g];
        for (let j = grp.start; j < grp.end; j++) {

          if ((j & 31) === 0 && now() > deadline) { timedOut = true; break; }
          if (xInt[j] <= 0) continue;
          for (let k = grp.start; k < grp.end; k++) {
            if (k === j) continue;

            let dMean = 0;
            let limit = xInt[j];
            for (let i = 0; i < M; i++) {
              d[i] = A[k * M + i] - A[j * M + i];
              dMean += d[i];
            }
            dMean /= M;

            let vv = 0;
            let uv = 0;
            for (let i = 0; i < M; i++) {
              v[i] = d[i] - dMean;
              vv += v[i] * v[i];
              uv += u[i] * v[i];
              if (d[i] > 0) limit = Math.min(limit, Math.floor(r[i] / d[i]));
            }
            if (vv <= 0 || limit < 1) continue;

            const ideal = uv / vv;
            const lo = Math.max(1, Math.min(limit, Math.floor(ideal)));
            const hi = Math.max(1, Math.min(limit, Math.ceil(ideal)));

            for (const q of (lo === hi ? [lo] : [lo, hi])) {
              let feasible = true;
              for (let i = 0; i < M; i++) {
                const val = r[i] - q * d[i];
                if (val < 0) { feasible = false; break; }
                cand[i] = val;
              }
              if (!feasible) continue;

              const score = spread(cand);
              if (score < moveVal - 1e-6) {
                moveVal = score;
                move = { j, k, q };
              }
            }
          }
        }
      }

      if (!move) break;

      xInt[move.j] -= move.q;
      xInt[move.k] += move.q;
      for (let i = 0; i < M; i++) {
        r[i] -= move.q * (A[move.k * M + i] - A[move.j * M + i]);
      }
      best = moveVal;
    }

    return computeUsage(A, n, xInt);
  }

  /* ---------------------------------------------------------------- *
   *  Reporting helpers                                               *
   * ---------------------------------------------------------------- */

  function buildReport(starting, usage) {
    const rows = [];
    const remaining = [];

    for (let i = 0; i < M; i++) {
      const start = Math.round(starting[i]);
      const used  = Math.round(usage[i]);
      const left  = start - used;
      remaining.push(left);
      rows.push({ mat: MATERIALS[i], starting: start, used, remaining: left });
    }

    const mean = remaining.reduce((a, b) => a + b, 0) / M;
    const variance = remaining.reduce((a, b) => a + (b - mean) * (b - mean), 0) / M;
    const max = Math.max.apply(null, remaining);
    const min = Math.min.apply(null, remaining);

    return {
      rows,
      remaining,
      stats: { std: Math.sqrt(variance), max, min, range: max - min, mean }
    };
  }

  function shortfallError(usage, budget) {
    const lines = [];
    for (let i = 0; i < M; i++) {
      const over = Math.round(usage[i] - budget[i]);
      if (over > 0) {
        lines.push({
          mat:   MATERIALS[i],
          need:  Math.round(usage[i]),
          have:  Math.round(budget[i]),
          short: over
        });
      }
    }
    const err = new Error("Not enough materials to complete this path.");
    err.shortfall = lines;
    return err;
  }

  /* ---------------------------------------------------------------- *
   *  Shared pipeline                                                 *
   * ---------------------------------------------------------------- */

  function runPipeline(columns, groups, matsAvailable) {
    const n = columns.length;
    if (n === 0) throw new Error("No craftable pieces available — check your level selection.");

    const budget = Float64Array.from(matsAvailable, (v) => Math.max(0, Math.round(v)));
    const A = buildMatrix(columns);

    let mean = 0;
    for (let i = 0; i < M; i++) mean += budget[i];
    mean /= M;
    const norm = mean || 1;

    const An = new Float64Array(M * n);
    for (let t = 0; t < A.length; t++) An[t] = A[t] / norm;

    const budgetN = new Float64Array(M);
    for (let i = 0; i < M; i++) budgetN[i] = budget[i] / norm;

    const B = new Float64Array(M * n);
    for (let j = 0; j < n; j++) {
      let colMean = 0;
      for (let i = 0; i < M; i++) colMean += An[j * M + i];
      colMean /= M;
      for (let i = 0; i < M; i++) B[j * M + i] = An[j * M + i] - colMean;
    }

    let budgetMean = 0;
    for (let i = 0; i < M; i++) budgetMean += budgetN[i];
    budgetMean /= M;
    const b = new Float64Array(M);
    for (let i = 0; i < M; i++) b[i] = budgetN[i] - budgetMean;

    const xFrac = PF.optimizer.solve({
      B, b, A: An, budget: budgetN, groups, m: M, n,
      enforceBudget: true
    });

    const xInt = roundPreserveTotals(xFrac, groups);
    let usage  = refineCounts(A, n, groups, xInt, budget);

    if (totalOverage(usage, budget) > 0) throw shortfallError(usage, budget);

    usage = polishCounts(A, n, groups, xInt, budget, 200, 400);

    return { xInt, usage, A, n };
  }

  /* ---------------------------------------------------------------- *
   *  Public entry points                                             *
   * ---------------------------------------------------------------- */

  function findPath({ amount, levels, mats }) {
    const active = levels.filter((lvl) => D.CRAFT_COSTS[lvl]);
    if (!active.length) throw new Error("Select at least one level.");
    if (!(amount > 0)) throw new Error("Amount must be a positive whole number.");

    const { columns, groups } = standardColumns(active, amount);
    const { xInt, usage } = runPipeline(columns, groups, mats);
    const report = buildReport(mats, usage);

    const levelResults = groups.map((grp) => ({
      level: grp.level,
      total: grp.N,
      pieces: []
    }));

    groups.forEach((grp, gi) => {
      for (let j = grp.start; j < grp.end; j++) {
        if (xInt[j] === 0) continue;
        const col = columns[j];
        levelResults[gi].pieces.push({
          name:  col.name,
          label: D.pieceName(col.name),
          set:   D.pieceSet(col.name),
          slot:  D.pieceSlot(col.name),
          count: xInt[j],
          mats:  col.mats,
          cost:  col.cost,
          extras: []
        });
      }
      levelResults[gi].pieces.sort((a, b) => b.count - a.count);
    });

    return {
      kind: "path",
      levels: levelResults,
      totalPieces: levelResults.reduce((a, l) => a + l.total, 0),
      report
    };
  }

  function findCustomPath({ amount, rarity, pieces, mats, title }) {
    if (!pieces.length) throw new Error("No pieces available — pick at least one set.");
    if (!(amount > 0)) throw new Error("Amount must be a positive whole number.");

    const { columns, groups, factor } = customColumns(pieces, rarity, amount);
    const { xInt, usage } = runPipeline(columns, groups, mats);
    const report = buildReport(mats, usage);

    const out = [];
    const extraTotals = {};

    columns.forEach((col, j) => {
      if (xInt[j] === 0) return;
      out.push({
        name:   col.name,
        label:  D.pieceName(col.name),
        set:    col.set || D.pieceSet(col.name),
        slot:   col.slot || D.pieceSlot(col.name),
        count:  xInt[j],
        mats:   col.mats,
        cost:   col.cost,
        extras: col.extras
      });
      col.extras.forEach((extra) => {
        extraTotals[extra.mat] = (extraTotals[extra.mat] || 0) + xInt[j] * extra.cost * factor;
      });
    });

    out.sort((a, b) => b.count - a.count);

    return {
      kind: "custom",
      levels: [{
        level: title || `Rarity ${D.RARITY_LABELS[rarity] || rarity}`,
        total: amount,
        pieces: out
      }],
      totalPieces: amount,
      extraTotals,
      report
    };
  }


  function findSetPath({ amount, level, rarity, setIds, mats }) {
    const pieces = [];
    const usedSets = [];
    const skipped = [];

    setIds.forEach((id) => {
      const set = D.SET_BY_ID[id];
      if (!set) return;

      const atLevel = set.pieces[level];
      if (!atLevel || !Object.keys(atLevel).length) {
        skipped.push(set.name);
        return;
      }
      usedSets.push(set.name);

      Object.keys(atLevel).forEach((name) => {
        const recipe  = atLevel[name];
        const listed  = recipe[0] || [];
        const cost    = recipe[1];
        const advCost = recipe.length > 2 ? recipe[2] : cost;

        const knownMats = [];
        const extras = [];
        listed.forEach((mat) => {
          if (mat in MAT_INDEX) knownMats.push(mat);
          else extras.push({ mat, cost });     
        });

        if (set.advanced) extras.push({ mat: set.advanced, cost: advCost });
        if (!knownMats.length) return;        

        pieces.push({
          name: name,
          set:  set.name,
          slot: D.pieceSlot(name),
          knownMats,
          cost,
          extras
        });
      });
    });

    if (!pieces.length) {
      throw new Error(`None of the selected sets have pieces at level ${level}.`);
    }

    const result = findCustomPath({
      amount, rarity, pieces, mats,
      title: `Level ${level} · ${D.RARITY_LABELS[rarity] || rarity}`
    });

    result.usedSets = usedSets;
    result.skippedSets = skipped;
    result.level = level;
    return result;
  }

  function maxCrafts({ mats, levels }) {
    const totalMats = mats.reduce((a, b) => a + b, 0);
    let totalCost = 0;

    levels.forEach((lvl) => {
      if (!D.CRAFT_COSTS[lvl]) return;
      const factor = Math.pow(4, D.RARITY_BY_LEVEL[lvl] || 0);
      totalCost += (D.FLUX_COST_PER_LEVEL[lvl] || 0) * factor;
    });

    if (totalCost === 0) return null;
    return { totalMats, totalCost, max: totalMats / totalCost };
  }

  PF.solver = {
    findPath, findCustomPath, findSetPath, maxCrafts,
    buildReport, runPipeline, roundPreserveTotals, refineCounts, polishCounts,
    computeUsage, buildMatrix, standardColumns, customColumns,
    MAT_INDEX, M
  };
})(globalThis.PF);
