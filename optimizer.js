globalThis.PF = globalThis.PF || {};

(function (PF) {
  "use strict";

  function matVec(M, m, n, x, out) {
    out.fill(0);
    for (let j = 0; j < n; j++) {
      const xj = x[j];
      if (xj === 0) continue;
      const off = j * m;
      for (let i = 0; i < m; i++) out[i] += M[off + i] * xj;
    }
    return out;
  }

  function matTVec(M, m, n, y, out) {
    for (let j = 0; j < n; j++) {
      const off = j * m;
      let s = 0;
      for (let i = 0; i < m; i++) s += M[off + i] * y[i];
      out[j] = s;
    }
    return out;
  }


  function projectSimplex(v, start, end, N, out) {
    const n = end - start;
    if (n <= 0) return out;

    if (N <= 0) {
      for (let i = start; i < end; i++) out[i] = 0;
      return out;
    }
    if (n === 1) {
      out[start] = N;
      return out;
    }

    const u = new Float64Array(n);
    for (let i = 0; i < n; i++) u[i] = v[start + i];
    u.sort((a, b) => b - a);

    let cumulative = 0;
    let theta = 0;
    for (let i = 0; i < n; i++) {
      cumulative += u[i];
      const t = (cumulative - N) / (i + 1);
      if (u[i] - t > 0) theta = t;
    }

    for (let i = start; i < end; i++) out[i] = Math.max(v[i] - theta, 0);
    return out;
  }

  function projectGroups(v, groups, out) {
    for (let g = 0; g < groups.length; g++) {
      const grp = groups[g];
      projectSimplex(v, grp.start, grp.end, grp.N, out);
    }
    return out;
  }


  function lipschitz(B, A, m, n, mu, iters) {
    let z = new Float64Array(n);
    for (let j = 0; j < n; j++) z[j] = Math.random() + 0.5;

    const tmpM = new Float64Array(m);
    const tmpN = new Float64Array(n);
    const acc  = new Float64Array(n);
    let lambda = 1;

    for (let k = 0; k < iters; k++) {
      let norm = 0;
      for (let j = 0; j < n; j++) norm += z[j] * z[j];
      norm = Math.sqrt(norm);
      if (norm === 0) return 1;
      for (let j = 0; j < n; j++) z[j] /= norm;

      matVec(B, m, n, z, tmpM);
      matTVec(B, m, n, tmpM, acc);
      for (let j = 0; j < n; j++) acc[j] *= 2;

      matVec(A, m, n, z, tmpM);
      matTVec(A, m, n, tmpM, tmpN);
      for (let j = 0; j < n; j++) acc[j] += 2 * mu * tmpN[j];

      lambda = 0;
      for (let j = 0; j < n; j++) lambda += z[j] * acc[j];
      z.set(acc);
    }
    return Math.max(lambda, 1e-12);
  }


  function fista(opts) {
    const { B, b, A, budget, groups, m, n, mu, maxIters, x0 } = opts;

    const L    = lipschitz(B, A, m, n, mu, 60);
    const step = 1 / L;

    let x = Float64Array.from(x0);
    let y = Float64Array.from(x0);

    const resM = new Float64Array(m);
    const tmpM = new Float64Array(m);
    const grad = new Float64Array(n);
    const tmpN = new Float64Array(n);
    const cand = new Float64Array(n);

    let t = 1;
    let scale = 1;
    for (let g = 0; g < groups.length; g++) scale = Math.max(scale, groups[g].N);
    const moveTol = 1e-11 * scale;
    let quiet = 0;

    for (let k = 0; k < maxIters; k++) {
      matVec(B, m, n, y, resM);
      for (let i = 0; i < m; i++) resM[i] -= b[i];
      matTVec(B, m, n, resM, grad);
      for (let j = 0; j < n; j++) grad[j] *= 2;

      matVec(A, m, n, y, tmpM);
      let violated = false;
      for (let i = 0; i < m; i++) {
        const over = tmpM[i] - budget[i];
        if (over > 0) { tmpM[i] = over; violated = true; } else { tmpM[i] = 0; }
      }
      if (violated) {
        matTVec(A, m, n, tmpM, tmpN);
        for (let j = 0; j < n; j++) grad[j] += 2 * mu * tmpN[j];
      }

      for (let j = 0; j < n; j++) cand[j] = y[j] - step * grad[j];
      const xNew = new Float64Array(n);
      projectGroups(cand, groups, xNew);

      let inner = 0;
      for (let j = 0; j < n; j++) inner += (y[j] - xNew[j]) * (xNew[j] - x[j]);
      if (inner > 0) t = 1;

      const tNext = (1 + Math.sqrt(1 + 4 * t * t)) / 2;
      const beta  = (t - 1) / tNext;

      let move = 0;
      for (let j = 0; j < n; j++) {
        const d = xNew[j] - x[j];
        if (Math.abs(d) > move) move = Math.abs(d);
        y[j] = xNew[j] + beta * d;
      }

      x = xNew;
      t = tNext;

      if (move < moveTol) {
        if (++quiet > 25) break;
      } else {
        quiet = 0;
      }
    }

    return x;
  }


  function solve(opts) {
    const { B, b, A, budget, groups, m, n } = opts;

    let x = new Float64Array(n);
    for (let g = 0; g < groups.length; g++) {
      const grp = groups[g];
      const width = grp.end - grp.start;
      if (width <= 0) continue;
      const share = grp.N / width;
      for (let j = grp.start; j < grp.end; j++) x[j] = share;
    }

    const stages = opts.enforceBudget ? [1e1, 1e3, 1e5] : [0];
    for (const mu of stages) {
      x = fista({
        B, b, A, budget, groups, m, n,
        mu,
        maxIters: opts.maxIters || 4000,
        x0: x
      });
    }
    return x;
  }

  PF.optimizer = { solve, fista, projectSimplex, projectGroups, matVec, matTVec, lipschitz };
})(globalThis.PF);
