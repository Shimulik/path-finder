/* ------------------------------------------------------------------ *
 *  ui.js — everything the user touches                                *
 * ------------------------------------------------------------------ */

(function (PF) {
  "use strict";

  const D = PF.data;
  const F = PF.format;
  const S = PF.store;
  const SOLVER = PF.solver;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  let state = S.load();
  let lastResult = null;

  /* ---------------------------------------------------------------- *
   *  Small utilities                                                 *
   * ---------------------------------------------------------------- */

  let toastTimer = null;
  function toast(message) {
    const node = $("toast");
    node.textContent = message;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 2200);
  }

  function showAlert(html, kind) {
    const node = $("alert");
    node.className = "alert" + (kind === "warn" ? " warn" : "");
    node.innerHTML = html;
    node.hidden = false;
  }

  function clearAlert() { $("alert").hidden = true; }


  function bringIntoView(node) {
    if (!node || node.hidden) return;
    const box = node.getBoundingClientRect();
    const room = window.innerHeight || document.documentElement.clientHeight;
    if (box.top >= 0 && box.top < room * 0.7) return;

    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  function copy(text, label) {
    const done = () => toast(label + " copied");
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, () => fallback());
    } else {
      fallback();
    }
    function fallback() {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Copy failed"); }
      document.body.removeChild(area);
    }
  }

  function persist(patch) { state = S.save(patch); }

  /* ---------------------------------------------------------------- *
   *  Materials                                                       *
   * ---------------------------------------------------------------- */

  function iconHtml(code, extraClass) {
    const icon = D.materialIcon(code);
    const cls = "mat-icon" + (extraClass ? " " + extraClass : "");

    if (icon) {
      return D.iconIsImage(icon)
        ? `<img class="${cls}" src="${esc(icon)}" data-code="${esc(code)}" alt="">`
        : `<span class="${cls}">${esc(icon)}</span>`;
    }
    if (D.materialName(code) !== code) {
      return `<span class="${cls} is-code">${esc(code)}</span>`;
    }
    return "";
  }

  function buildMatGrid() {
    const grid = $("matGrid");
    grid.innerHTML = D.MATERIALS.map((mat) => `
      <div class="mat-cell">
        ${iconHtml(mat)}
        <label for="mat-${mat}" title="${esc(mat)}">${esc(D.materialName(mat))}</label>
        <div class="mat-input">
          <input type="text" id="mat-${mat}" data-mat="${mat}" inputmode="decimal" spellcheck="false">
          <span class="unit" data-unit hidden></span>
        </div>
      </div>`).join("");

    grid.querySelectorAll("input[data-mat]").forEach((input) => {
      input.addEventListener("focus", () => input.select());
      input.addEventListener("change", () => commitMat(input));
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { commitMat(input); input.blur(); }
      });
    });
  }

  function commitMat(input) {
    const index = D.MATERIALS.indexOf(input.dataset.mat);
    try {
      const value = F.parseQuantity(input.value, state.scale);
      if (value < 0) throw new Error("cannot be negative");
      const mats = state.mats.slice();
      mats[index] = value;
      persist({ mats });
      input.classList.remove("bad");
    } catch (e) {
      input.classList.add("bad");
      toast(`${input.dataset.mat}: ${e.message}`);
    }
    renderMats();
  }

  const UNIT_LABEL = { 1000: "K", 1000000: "M", 1000000000: "B" };

  function renderMats() {
    const unit = UNIT_LABEL[state.scale] || "";

    D.MATERIALS.forEach((mat, i) => {
      const input = $("mat-" + mat);
      if (input && document.activeElement !== input) {
        input.value = F.toDisplay(state.mats[i], state.scale);
      }
      const chip = input && input.parentNode.querySelector("[data-unit]");
      if (chip) {
        chip.textContent = unit;
        chip.hidden = !unit;
      }
    });

    const setAll = $("setAllInput");
    setAll.placeholder = unit ? `all… (${unit})` : "all…";

    const total = state.mats.reduce((a, b) => a + b, 0);
    $("matTotal").textContent = "Total: " + F.compact(total);
    renderMaxHint();
  }

  function renderMaxHint() {
    const info = SOLVER.maxCrafts({ mats: state.mats, levels: state.levels });
    const node = $("maxHint");
    if (!info) {
      node.textContent = "Select at least one level to craft.";
      return;
    }
    node.innerHTML = `Your materials cover roughly <em>${F.int(Math.floor(info.max))}</em> pieces `
      + `per level for levels [${esc(state.levels.join(", "))}].`;
  }

  /* ---------------------------------------------------------------- *
   *  Levels                                                          *
   * ---------------------------------------------------------------- */


  function buildLevelChips() {
    const box = $("levelChips");
    box.innerHTML = D.VALID_LEVELS.map((lvl) =>
      `<button type="button" class="lvl-chip" data-level="${lvl}"
               aria-pressed="false" aria-label="Level ${lvl}">${lvl}</button>`
    ).join("");

    box.querySelectorAll(".lvl-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const lvl = chip.dataset.level;
        let levels = state.levels.slice();
        if (levels.indexOf(lvl) === -1) levels.push(lvl);
        else levels = levels.filter((l) => l !== lvl);

        if (!levels.length) { toast("Keep at least one level selected"); return; }

        levels.sort((a, b) => Number(a) - Number(b));
        persist({ levels });
        renderLevels();
      });
    });
  }

  function renderLevels() {
    document.querySelectorAll(".lvl-chip[data-level]").forEach((chip) => {
      chip.setAttribute("aria-pressed", state.levels.indexOf(chip.dataset.level) !== -1);
    });
    renderMaxHint();
  }

  /* ---------------------------------------------------------------- *
   *  Custom pieces                                                   *
   * ---------------------------------------------------------------- */


  function buildRarityPicker() {
    $("customRarity").innerHTML = D.RARITY_LABELS.map((label, i) =>
      `<button type="button" class="rarity-swatch" data-rarity="${i}" role="radio"
               aria-checked="false" style="--rar: ${D.RARITY_COLORS[i]}"
               title="${esc(label)} = ×${Math.pow(4, i)}">
         <span class="rarity-dot" aria-hidden="true"></span>
         <span class="rarity-name">${esc(label)}</span>
       </button>`
    ).join("");

    $("customRarity").querySelectorAll(".rarity-swatch").forEach((swatch) => {
      swatch.addEventListener("click", () => {
        persist({ customRarity: Number(swatch.dataset.rarity) });
        renderRarity();
      });
    });
  }

  function renderRarity() {
    const picked = state.customRarity;
    $("customRarity").querySelectorAll(".rarity-swatch").forEach((swatch) => {
      swatch.setAttribute("aria-checked", Number(swatch.dataset.rarity) === picked);
    });
    $("rarityHint").innerHTML =
      `Every material cost is multiplied by <strong>×${F.int(Math.pow(4, picked))}</strong>.`;
  }

  /* ---------------------------------------------------------------- *
   *  Set picker                                                      *
   * ---------------------------------------------------------------- */


  function buildCustomLevelChips() {
    $("customLevelChips").innerHTML = D.CUSTOM_LEVELS.map((lvl) =>
      `<button type="button" class="lvl-chip" data-clevel="${lvl}" role="radio"
               aria-checked="false" aria-label="Level ${lvl}">${lvl}</button>`
    ).join("");

    $("customLevelChips").querySelectorAll(".lvl-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        persist({ customLevel: chip.dataset.clevel });
        renderCustomLevel();
        renderSets();
      });
    });
  }

  function renderCustomLevel() {
    $("customLevelChips").querySelectorAll(".lvl-chip").forEach((chip) => {
      chip.setAttribute("aria-checked", chip.dataset.clevel === state.customLevel);
    });
  }


  const seasonKey = (set) => set.season || "Other";

  function allSeasons() {
    const seen = [];
    D.SETS.forEach((set) => {
      const key = seasonKey(set);
      if (seen.indexOf(key) === -1) seen.push(key);
    });
    return seen.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  let activeSeason = null;       
  let showUnavailable = false;

  const searchQuery = () => ($("setSearch").value || "").trim().toLowerCase();
  const availableAt = (set) => D.pieceCountAtLevel(set, state.customLevel);
  const isPicked = (set) => state.customSets.indexOf(set.id) !== -1;

  function matchesSearch(set) {
    const query = searchQuery();
    if (!query) return true;
    return [set.name, set.season, set.advanced, set.id]
      .join(" ").toLowerCase().indexOf(query) !== -1;
  }

  function ensureActiveSeason() {
    if (activeSeason !== null) return;
    const picked = D.SETS.filter(isPicked)[0];
    activeSeason = picked ? seasonKey(picked) : (allSeasons()[0] || "");
  }

  function paneSets() {
    const searching = !!searchQuery();
    return D.SETS.filter((set) => {
      if (!matchesSearch(set)) return false;
      if (!searching && activeSeason && seasonKey(set) !== activeSeason) return false;
      if (!showUnavailable && !availableAt(set)) return false;
      return true;
    });
  }

  function toggleSet(id, on) {
    let picked = state.customSets.slice();
    if (on) {
      if (picked.indexOf(id) === -1) picked.push(id);
    } else {
      picked = picked.filter((s) => s !== id);
    }
    persist({ customSets: picked });
  }


  function bannerHtml(set) {
    const src = D.setBanner(set);
    if (!src) return "";
    return `<span class="card-art"><img class="set-art" src="${esc(src)}" alt=""
                 loading="lazy" decoding="async"></span>`;
  }

  function setIconHtml(set) {
    const src = D.setIcon(set);
    if (!src) return "";
    return `<img class="set-adv-icon" src="${esc(src)}" alt=""
                 title="${esc(set.advanced)}" loading="eager">`;
  }

  function renderRail() {
    const searching = !!searchQuery();
    const rail = $("seasonRail");

    const item = (attrs, label, avail, picked, active) =>
      `<button type="button" class="rail-item${active ? " active" : ""}${avail ? "" : " empty"}"
               ${attrs} aria-current="${active}">
         <span class="rail-label">${esc(label)}</span>
         ${picked ? `<span class="rail-picked">${picked}</span>` : ""}
         <span class="rail-count">${avail}</span>
       </button>`;

    const rows = [item(
      'data-all="1"', "All Seasons",
      D.SETS.filter(availableAt).length,
      D.SETS.filter(isPicked).length,
      !searching && activeSeason === ""
    )];

    allSeasons().forEach((key) => {
      const inSeason = D.SETS.filter((set) => seasonKey(set) === key);
      rows.push(item(
        `data-season="${esc(key)}"`, key,
        inSeason.filter(availableAt).length,
        inSeason.filter(isPicked).length,
        !searching && activeSeason === key
      ));
    });

    rail.innerHTML = rows.join("");

    rail.querySelectorAll(".rail-item").forEach((button) => {
      button.addEventListener("click", () => {
        activeSeason = button.hasAttribute("data-all") ? "" : button.dataset.season;
        $("setSearch").value = "";
        renderSets();
      });
    });
  }

  function renderCards() {
    const searching = !!searchQuery();
    const sets = paneSets();
    const box = $("setCards");

    $("paneTitle").textContent = searching
      ? `Matching “${$("setSearch").value.trim()}”`
      : (activeSeason || "All Seasons");

    if (!sets.length) {
      box.innerHTML = `<p class="empty-note">${searching
        ? "Nothing matches that search."
        : "No sets here with pieces at this level."}</p>`;
    } else {
      box.innerHTML = sets.map((set) => {
        const count = availableAt(set);
        const picked = isPicked(set);
        const showSeason = searching || !activeSeason;
        return `<button type="button" class="set-card${picked ? " picked" : ""}${count ? "" : " dim"}"
                  data-set="${esc(set.id)}" aria-pressed="${picked}"${count ? "" : " disabled"}>
          <span class="card-tick" aria-hidden="true">✓</span>
          ${bannerHtml(set)}
          <span class="card-name">${setIconHtml(set)}<span>${esc(set.name)}</span></span>
          ${set.advanced && set.advanced !== set.name
              ? `<span class="card-adv">◆ ${esc(set.advanced)}</span>` : ""}
          <span class="card-foot">
            ${showSeason ? `<span class="card-season">${esc(seasonKey(set))}</span>` : ""}
            <span class="card-count">${count ? count + " pieces" : "not at L" + esc(state.customLevel)}</span>
          </span>
        </button>`;
      }).join("");

      box.querySelectorAll(".set-card").forEach((card) => {
        card.addEventListener("click", () => {
          toggleSet(card.dataset.set, !isPicked(D.SET_BY_ID[card.dataset.set]));
          renderSets();
        });
      });
    }

    const hiddenHere = D.SETS.filter((set) => {
      if (!matchesSearch(set)) return false;
      if (!searching && activeSeason && seasonKey(set) !== activeSeason) return false;
      return !availableAt(set);
    }).length;

    const note = $("paneNote");
    if (!hiddenHere) {
      note.innerHTML = "";
    } else if (showUnavailable) {
      note.innerHTML = `Showing ${hiddenHere} set${hiddenHere === 1 ? "" : "s"} with nothing `
        + `at level ${esc(state.customLevel)}. <button type="button" class="linky" id="toggleUnavail">Hide them</button>`;
    } else {
      note.innerHTML = `${hiddenHere} set${hiddenHere === 1 ? "" : "s"} here have nothing `
        + `at level ${esc(state.customLevel)}. <button type="button" class="linky" id="toggleUnavail">Show anyway</button>`;
    }
    if ($("toggleUnavail")) {
      $("toggleUnavail").addEventListener("click", () => {
        showUnavailable = !showUnavailable;
        renderSets();
      });
    }
  }

  function renderTray() {
    const picked = D.SETS.filter(isPicked);
    const tray = $("setTray");

    if (!picked.length) {
      tray.innerHTML = `<span class="tray-empty">Nothing selected yet — pick a set above.</span>`;
      return;
    }

    tray.innerHTML =
      `<span class="tray-label">${picked.length} selected</span>`
      + picked.map((set) => `<button type="button" class="tray-chip${availableAt(set) ? "" : " stale"}"
            data-remove="${esc(set.id)}" title="${availableAt(set)
              ? "Remove " + esc(set.name)
              : esc(set.name) + " has nothing at level " + esc(state.customLevel)}">
            <span>${esc(set.name)}</span><span class="x" aria-hidden="true">✕</span>
          </button>`).join("")
      + `<button type="button" class="btn ghost tiny tray-clear" id="trayClear">Clear all</button>`;

    tray.querySelectorAll("[data-remove]").forEach((chip) => {
      chip.addEventListener("click", () => {
        toggleSet(chip.dataset.remove, false);
        renderSets();
      });
    });

    $("trayClear").addEventListener("click", () => {
      persist({ customSets: [] });
      renderSets();
    });
  }

  function renderSetsHint() {
    const level = state.customLevel;
    const active = state.customSets
      .map((id) => D.SET_BY_ID[id])
      .filter((set) => set && D.pieceCountAtLevel(set, level) > 0);

    const pieces = active.reduce((sum, set) => sum + D.pieceCountAtLevel(set, level), 0);

    if (!active.length) {
      $("setsHint").textContent = state.customSets.length
        ? `Nothing selected has pieces at level ${level} — pick a set that does.`
        : "";
      return;
    }

    $("setsHint").textContent = `${pieces} piece${pieces === 1 ? "" : "s"} from `
      + `${active.length} set${active.length === 1 ? "" : "s"} at level ${level}.`;
  }

  function renderSets() {
    ensureActiveSeason();
    renderRail();
    renderCards();
    renderTray();
    renderSetsHint();
  }

  /* ---------------------------------------------------------------- *
   *  Solving                                                         *
   * ---------------------------------------------------------------- */

  function readAmount(id) {
    try {
      const value = F.parseQuantity($(id).value, 0);
      if (!(value > 0)) throw new Error("must be greater than zero");
      return value;
    } catch (e) {
      throw new Error(`Amount ${e.message}`);
    }
  }

  function runSolve(fn) {
    clearAlert();
    try {
      const result = fn();
      lastResult = result;
      renderResult(result);
      if (state.autoApply) applyRemaining(true);
      bringIntoView($("results"));
    } catch (e) {
      $("results").hidden = true;
      lastResult = null;
      renderError(e);
      bringIntoView($("alert"));
    }
  }

  function renderError(error) {
    if (error.shortfall && error.shortfall.length) {
      const rows = error.shortfall.map((s) =>
        `<li class="mono">${s.mat} — need ${F.int(s.need)}, have ${F.int(s.have)} `
        + `(short ${F.int(s.short)})</li>`
      ).join("");
      showAlert(
        `<h3>Not enough materials for that many pieces</h3>
         <p>Lower the amount, drop a level, or top these up:</p>
         <ul>${rows}</ul>`
      );
    } else {
      showAlert(`<h3>Could not build a path</h3><p>${esc(error.message)}</p>`);
    }
  }

  function solveStandard() {
    runSolve(() => SOLVER.findPath({
      amount: readAmount("pathAmount"),
      levels: state.levels,
      mats: state.mats
    }));
  }

  function solveCustom() {
    clearAlert();

    if (!state.customSets.length) {
      $("results").hidden = true;
      showAlert(`<h3>Nothing to solve</h3><p>Tick at least one set to craft from.</p>`);
      bringIntoView($("alert"));
      return;
    }

    let amount;
    const rarity = state.customRarity;
    try {
      amount = readAmount("customAmount");
    } catch (e) {
      showAlert(`<h3>Could not build a path</h3><p>${esc(e.message)}</p>`);
      bringIntoView($("alert"));
      return;
    }

    try {
      lastResult = SOLVER.findSetPath({
        amount,
        level:  state.customLevel,
        rarity,
        setIds: state.customSets,
        mats:   state.mats
      });
      renderResult(lastResult);

      if (lastResult.skippedSets.length) {
        showAlert(
          `<h3>Heads up</h3><p>No pieces at level ${esc(state.customLevel)} in `
          + `${esc(lastResult.skippedSets.join(", "))} — left out of this path.</p>`,
          "warn"
        );
      }
      if (state.autoApply) applyRemaining(true);
      bringIntoView(lastResult.skippedSets.length ? $("alert") : $("results"));
    } catch (e) {
      $("results").hidden = true;
      lastResult = null;
      renderError(e);
      bringIntoView($("alert"));
    }
  }

  /* ---------------------------------------------------------------- *
   *  Result rendering                                                *
   * ---------------------------------------------------------------- */

  const SLOT_ORDER = {};
  D.SLOTS.forEach((slot, i) => { SLOT_ORDER[slot] = i; });

  const labelOf = (p) => p.label || D.pieceName(p.name);
  const slotOf  = (p) => p.slot || D.pieceSlot(p.name);
  const setOf   = (p) => p.set || D.pieceSet(p.name);

  function sortPieces(pieces) {
    const byLabel = (a, b) => labelOf(a).localeCompare(labelOf(b), undefined, { numeric: true });

    const slotRank = (p) => {
      const slot = slotOf(p);
      return slot in SLOT_ORDER ? SLOT_ORDER[slot] : 999;
    };
    const setKey = (p) => setOf(p) || "￿";

    const list = pieces.slice();
    switch (state.sortMode) {
      case "name":
        list.sort(byLabel);
        break;
      case "slot":
        list.sort((a, b) => slotRank(a) - slotRank(b) || byLabel(a, b));
        break;
      case "set":
        list.sort((a, b) => setKey(a).localeCompare(setKey(b))
                         || slotRank(a) - slotRank(b)
                         || byLabel(a, b));
        break;
      default:
        list.sort((a, b) => b.count - a.count || byLabel(a, b));
    }
    return list;
  }

  function renderResult(result) {
    const stats = result.report.stats;

    $("statRow").innerHTML = [
      { label: "Temp Count", value: F.int(result.totalPieces), sub: result.kind === "path"
          ? `${result.levels.length} level${result.levels.length === 1 ? "" : "s"}`
          : "", accent: true },
      { label: "Spread", value: F.compact(Math.round(stats.std)), sub: "std deviation" },
      { label: "Range", value: F.compact(stats.range), sub: "highest minus lowest" },
      { label: "Lowest left", value: F.compact(stats.min), sub: "smallest remaining amount" }
    ].map((s) => `
      <div class="stat${s.accent ? " accent" : ""}">
        <div class="label">${s.label}</div>
        <div class="value">${s.value}</div>
        ${s.sub ? `<div class="sub">${s.sub}</div>` : ""}
      </div>`).join("");

    const standardRows = result.report.rows.map((row) => {
      const low = row.remaining <= 0 ? ' class="low"' : "";
      return `<tr${low}>
        <td class="mat-name">${iconHtml(row.mat, "sm")}<span>${esc(D.materialName(row.mat))}</span></td>
        <td class="num lead">${F.int(row.remaining)}</td>
        <td class="num muted">${F.int(row.starting)}</td>
        <td class="num muted">${F.int(row.used)}</td>
      </tr>`;
    }).join("");

    const extras = result.extraTotals || {};
    const extraKeys = Object.keys(extras).sort();
    const extraRows = extraKeys.length
      ? `<tr class="group"><td colspan="4">Advanced materials used</td></tr>`
        + extraKeys.map((mat) => `<tr>
            <td class="mat-name"><span>${esc(mat)}</span></td>
            <td class="num dash">—</td>
            <td class="num dash">—</td>
            <td class="num lead">${F.int(extras[mat])}</td>
          </tr>`).join("")
      : "";

    $("matReport").innerHTML = standardRows + extraRows;

    $("pathOutput").innerHTML = result.levels.map((level) => {
      const pieces = sortPieces(level.pieces).map((piece) => {
        const matNames = piece.mats.map((m) => D.materialName(m)).join(", ");
        const extraNames = (piece.extras || []).map((e) => e.mat);
        const extra = extraNames.length ? " + " + esc(extraNames.join(", ")) : "";
        const meta = state.showMats
          ? `<span class="meta">${esc(matNames)}${extra} · ${F.int(piece.cost)}</span>`
          : "";

        const label = labelOf(piece);
        const adds = (text) => text && label.toLowerCase().indexOf(text.toLowerCase()) === -1;

        const set = setOf(piece);
        const slot = slotOf(piece);
        const tags = [
          adds(set) ? `<span class="tag set">${esc(set)}</span>` : "",
          adds(slot) ? `<span class="tag">${esc(slot)}</span>` : ""
        ].join("");

        return `<div class="path-piece">
                  <span class="qty">${F.int(piece.count)}×</span>
                  <span class="name">${esc(label)}</span>
                  ${tags}${meta}
                </div>`;
      }).join("") || `<p class="empty-note">Nothing scheduled at this level.</p>`;

      const title = result.kind === "path" ? `Level ${esc(level.level)}` : esc(level.level);
      return `<div class="path-level">
                <div class="path-level-head">
                  <h3>${title}</h3>
                  <span class="count">${F.int(level.total)} pieces</span>
                </div>${pieces}
              </div>`;
    }).join("");

    $("results").hidden = false;
  }

  function pathAsText(result) {
    const lines = [];
    result.levels.forEach((level) => {
      lines.push(result.kind === "path" ? `Level ${level.level}` : level.level);
      sortPieces(level.pieces).forEach((piece) => {
        const label = labelOf(piece);
        const slot = slotOf(piece);
        let line = `  ${String(F.int(piece.count)).padStart(7)}x ${label}`;
        if (slot && label.toLowerCase().indexOf(slot.toLowerCase()) === -1) line += ` (${slot})`;
        if (state.showMats) {
          const mats = piece.mats.map((m) => D.materialName(m))
            .concat((piece.extras || []).map((e) => e.mat)).join(", ");
          line += `   [${mats} | ${piece.cost}]`;
        }
        lines.push(line);
      });
      lines.push("");
    });

    const extras = result.extraTotals || {};
    const extraKeys = Object.keys(extras).sort();
    if (extraKeys.length) {
      lines.push("Advanced materials required");
      extraKeys.forEach((mat) => {
        lines.push(`  ${String(F.int(extras[mat])).padStart(12)}  ${mat}`);
      });
    }
    return lines.join("\n").trim();
  }

  function applyRemaining(silent) {
    if (!lastResult) return;
    persist({ mats: lastResult.report.remaining.map((v) => Math.max(0, v)) });
    renderMats();
    if (!silent) toast("Materials updated");
    else toast("Path applied to your materials");
  }

  /* ---------------------------------------------------------------- *
   *  Options / theme / dialog                                        *
   * ---------------------------------------------------------------- */

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    $("themeBtn").textContent = state.theme === "dark" ? "◐" : "◑";
  }

  function bindOptions() {
    const showMats = $("optShowMats");
    const autoApply = $("optAutoApply");
    const scale = $("optScale");

    showMats.addEventListener("change", () => {
      persist({ showMats: showMats.checked });
      if (lastResult) renderResult(lastResult);
    });

    autoApply.addEventListener("change", () => persist({ autoApply: autoApply.checked }));

    scale.addEventListener("change", () => {
      persist({ scale: Number(scale.value) });
      renderMats();
    });

    $("themeBtn").addEventListener("click", () => {
      persist({ theme: state.theme === "dark" ? "light" : "dark" });
      applyTheme();
    });

    $("resetBtn").addEventListener("click", () => {
      if (!confirm("Reset materials, levels and options back to defaults?")) return;
      state = S.reset();
      syncControls();
      $("results").hidden = true;
      clearAlert();
      lastResult = null;
      toast("Everything reset");
    });
  }

  function syncControls() {
    $("optShowMats").checked = state.showMats;
    $("optAutoApply").checked = state.autoApply;
    $("optScale").value = String(state.scale);
    $("sortMode").value = state.sortMode;
    selectTab(state.tab, false);
    applyTheme();
    renderMats();
    renderLevels();
    renderCustomLevel();
    renderRarity();
    renderSets();
  }

  /* ---------------------------------------------------------------- *
   *  Wiring                                                          *
   * ---------------------------------------------------------------- */

  function selectTab(which, remember) {
    const standard = $("tabStandard");
    const custom = $("tabCustom");
    const isStandard = which !== "custom";

    [[standard, isStandard], [custom, !isStandard]].forEach(([tab, on]) => {
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", on);

      tab.tabIndex = on ? 0 : -1;
    });

    $("panelStandard").hidden = !isStandard;
    $("panelCustom").hidden = isStandard;


    $("results").hidden = true;
    clearAlert();
    lastResult = null;

    if (remember) persist({ tab: isStandard ? "standard" : "custom" });
  }

  function bindTabs() {
    const tabs = [$("tabStandard"), $("tabCustom")];

    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => selectTab(i ? "custom" : "standard", true));
      tab.addEventListener("keydown", (e) => {
        const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!step) return;
        e.preventDefault();
        const next = tabs[(i + step + tabs.length) % tabs.length];
        selectTab(next === tabs[1] ? "custom" : "standard", true);
        next.focus();
      });
    });
  }

  function bindBulkImport() {
    const panel = $("bulkPanel");

    $("bulkBtn").addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      $("bulkMsg").textContent = "";
      if (!panel.hidden) $("bulkInput").focus();
    });

    $("bulkCancel").addEventListener("click", () => { panel.hidden = true; });

    $("bulkApply").addEventListener("click", () => {
      const { values, errors } = F.parseMatsBlock($("bulkInput").value, state.scale);
      const keys = Object.keys(values);

      if (keys.length) {
        const mats = state.mats.slice();
        keys.forEach((mat) => { mats[D.MATERIALS.indexOf(mat)] = values[mat]; });
        persist({ mats });
        renderMats();
      }

      if (errors.length) {
        $("bulkMsg").textContent = errors.slice(0, 4).join(" · ");
      } else {
        panel.hidden = true;
        $("bulkInput").value = "";
      }
      if (keys.length) toast(`Updated ${keys.length} material${keys.length === 1 ? "" : "s"}`);
    });
  }

  function bindSetPicker() {
    let searchTimer = null;
    $("setSearch").addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderSets, 120);
    });

    $("paneAll").addEventListener("click", () => {
      const picked = state.customSets.slice();
      paneSets().forEach((set) => {
        if (availableAt(set) && picked.indexOf(set.id) === -1) picked.push(set.id);
      });
      persist({ customSets: picked });
      renderSets();
    });

    $("paneNone").addEventListener("click", () => {
      const shown = paneSets().map((set) => set.id);
      persist({ customSets: state.customSets.filter((id) => shown.indexOf(id) === -1) });
      renderSets();
    });
  }

  function bindActions() {
    $("solvePathBtn").addEventListener("click", solveStandard);
    $("solveCustomBtn").addEventListener("click", solveCustom);

    $("pathAmount").addEventListener("keydown", (e) => { if (e.key === "Enter") solveStandard(); });
    $("customAmount").addEventListener("keydown", (e) => { if (e.key === "Enter") solveCustom(); });

    $("setAllBtn").addEventListener("click", () => {
      const raw = $("setAllInput").value.trim();
      if (!raw) { toast("Enter a value first"); return; }
      try {
        const value = F.parseQuantity(raw, state.scale);
        if (value < 0) throw new Error("cannot be negative");
        persist({ mats: D.MATERIALS.map(() => value) });
        $("setAllInput").value = "";
        renderMats();
        toast("All materials set to " + F.compact(value));
      } catch (e) {
        toast(e.message);
      }
    });

    $("setAllInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("setAllBtn").click();
    });

    $("applyBtn").addEventListener("click", () => applyRemaining(false));

    $("sortMode").addEventListener("change", () => {
      persist({ sortMode: $("sortMode").value });
      if (lastResult) renderResult(lastResult);
    });

    $("copyPathBtn").addEventListener("click", () => {
      if (!lastResult) return;
      copy(pathAsText(lastResult), "Path");
    });

    const dialog = $("helpDialog");
    $("helpBtn").addEventListener("click", () => dialog.showModal());
    $("helpClose").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

    bindDrawer();
    bindSupport();
    bindShare();
  }

  /* ---------------------------------------------------------------- *
   *  Support link                                                    *
   * ---------------------------------------------------------------- */


  function bindSupport() {
    const cfg = D.SUPPORT || {};
    if (!cfg.url) return;

    const label = cfg.label || "Support this site";
    const icon  = cfg.icon || "♥";

    const header = $("supportLink");
    header.href = cfg.url;
    header.innerHTML = `<span class="btn-glyph" aria-hidden="true">${esc(icon)}</span>`
      + `<span class="btn-label">${esc(label)}</span>`;
    header.setAttribute("aria-label", label);
    header.title = label;
    header.hidden = false;

    const footer = $("supportFooter");
    footer.href = cfg.url;
    footer.textContent = icon + " " + label;
    footer.hidden = false;
  }

  /* ---------------------------------------------------------------- *
   *  Share codes                                                     *
   * ---------------------------------------------------------------- */

  function shareNote(text, kind) {
    const el = $("shareMsg");
    el.textContent = text || "";
    el.className = "hint" + (kind ? " " + kind : "");
  }

  async function refreshShareCode() {
    try {
      const code = await PF.share.encode(state);
      $("shareOut").value = code;
      $("shareSize").textContent = code.length + " characters";
    } catch (e) {
      $("shareOut").value = "";
      $("shareSize").textContent = "";
      shareNote("Could not build a code: " + e.message, "bad");
    }
  }

  function bindShare() {
    const dialog = $("shareDialog");

    $("shareBtn").addEventListener("click", async () => {
      $("shareIn").value = "";
      shareNote("");
      await refreshShareCode();
      dialog.showModal();
    });

    $("shareClose").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

    $("shareCopy").addEventListener("click", () => {
      const code = $("shareOut").value;
      if (code) copy(code, "Code");
    });

    $("shareClear").addEventListener("click", () => {
      $("shareIn").value = "";
      shareNote("");
    });

    $("shareApply").addEventListener("click", async () => {
      let result;
      try {
        result = await PF.share.decode($("shareIn").value);
      } catch (e) {
        shareNote(e.message, "bad");
        return;
      }

      persist(result.patch);
      syncControls();
      $("results").hidden = true;
      lastResult = null;

      const missing = result.missingSets;
      if (missing.length) {
        shareNote(`Loaded — but ${missing.length} set${missing.length > 1 ? "s" : ""} in that code `
          + `${missing.length > 1 ? "are" : "is"} not in this version and ${missing.length > 1 ? "were" : "was"} `
          + `skipped: ${missing.join(", ")}`, "warn");
      } else {
        shareNote("Loaded.", "good");
      }

      await refreshShareCode();
      toast("Setup loaded");
    });
  }


  function drawerOpen() { return !$("settingsDrawer").hidden; }

  function openDrawer() {
    if (drawerOpen()) return;
    const drawer = $("settingsDrawer");

    drawer.hidden = false;
    $("drawerScrim").hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    $("settingsBtn").setAttribute("aria-expanded", "true");

    void drawer.offsetWidth;
    document.body.classList.add("drawer-open");


    document.querySelector("main").inert = true;
    $("drawerClose").focus();
  }

  function closeDrawer() {
    if (!drawerOpen()) return;
    const drawer = $("settingsDrawer");

    document.body.classList.remove("drawer-open");
    drawer.setAttribute("aria-hidden", "true");
    $("settingsBtn").setAttribute("aria-expanded", "false");
    document.querySelector("main").inert = false;

    const finish = () => { drawer.hidden = true; $("drawerScrim").hidden = true; };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else setTimeout(finish, 200);

    $("settingsBtn").focus();
  }

  function bindDrawer() {
    $("settingsBtn").addEventListener("click", () => {
      drawerOpen() ? closeDrawer() : openDrawer();
    });
    $("drawerClose").addEventListener("click", closeDrawer);
    $("drawerScrim").addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawerOpen()) closeDrawer();
    });
  }

  /* ---------------------------------------------------------------- *
   *  Boot                                                            *
   * ---------------------------------------------------------------- */

  document.addEventListener("error", (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement)) return;

    if (img.classList.contains("set-art")) {
      (img.closest(".card-art") || img).remove();
      return;
    }
    if (img.classList.contains("set-adv-icon")) { img.remove(); return; }


    if (img.classList.contains("brand-mark")) { img.remove(); return; }

    if (!img.classList.contains("mat-icon")) return;

    const code = img.dataset.code || "";
    if (D.materialName(code) === code) {
      img.remove();
      return;
    }
    const badge = document.createElement("span");
    badge.className = "mat-icon" + (img.classList.contains("sm") ? " sm" : "") + " is-code";
    badge.textContent = code;
    img.replaceWith(badge);
  }, true);

  buildMatGrid();
  buildLevelChips();
  buildRarityPicker();
  buildCustomLevelChips();
  bindTabs();
  bindOptions();
  bindBulkImport();
  bindSetPicker();
  bindActions();
  syncControls();

  if (!S.canPersist) {
    showAlert("<h3>Settings won't be saved</h3><p>This browser is blocking local storage, "
      + "so your materials will reset when you leave.</p>", "warn");
  }
})(globalThis.PF);
