globalThis.PF = globalThis.PF || {};

(function (PF) {
  "use strict";

  const D = PF.data;
  const KEY = "pathfinder.settings.v1";

  function available() {
    try {
      const probe = "__pf__";
      localStorage.setItem(probe, "1");
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  }

  const canPersist = available();
  let state = null;

  function sanitize(raw) {
    const out = {
      mats:      D.DEFAULTS.mats.slice(),
      levels:    D.DEFAULTS.levels.slice(),
      scale:     D.DEFAULTS.scale,
      showMats:  D.DEFAULTS.showMats,
      autoApply: D.DEFAULTS.autoApply,
      sortMode:    D.DEFAULTS.sortMode,
      customLevel: D.DEFAULTS.customLevel,
      customRarity: D.DEFAULTS.customRarity,
      customSets:  D.DEFAULTS.customSets.slice(),
      theme:       D.DEFAULTS.theme,
      tab:         D.DEFAULTS.tab
    };
    if (!raw || typeof raw !== "object") return out;

    if (Array.isArray(raw.mats) && raw.mats.length === D.MATERIALS.length) {
      out.mats = raw.mats.map((v) => {
        const n = Number(v);
        return isFinite(n) && n > 0 ? Math.round(n) : 0;
      });
    }

    if (Array.isArray(raw.levels)) {
      const picked = raw.levels.filter((l) => D.VALID_LEVELS.indexOf(String(l)) !== -1)
                               .map(String);
      if (picked.length) out.levels = Array.from(new Set(picked));
    }

    const scale = Number(raw.scale);
    if (isFinite(scale) && scale >= 0) out.scale = Math.round(scale);

    out.showMats  = !!raw.showMats;
    out.autoApply = !!raw.autoApply;
    if (["count", "name", "slot", "set"].indexOf(raw.sortMode) !== -1) out.sortMode = raw.sortMode;
    if (raw.theme === "light" || raw.theme === "dark") out.theme = raw.theme;
    if (raw.tab === "standard" || raw.tab === "custom") out.tab = raw.tab;

    if (D.CUSTOM_LEVELS.indexOf(String(raw.customLevel)) !== -1) {
      out.customLevel = String(raw.customLevel);
    }

    const rarity = Number(raw.customRarity);
    if (Number.isInteger(rarity) && rarity >= 0 && rarity < D.RARITY_LABELS.length) {
      out.customRarity = rarity;
    }


    if (Array.isArray(raw.customSets)) {
      out.customSets = raw.customSets
        .map(String)
        .filter((id) => !!D.SET_BY_ID[id])
        .filter((id, i, list) => list.indexOf(id) === i);
    }

    return out;
  }

  function load() {
    if (state) return state;
    let raw = null;
    if (canPersist) {
      try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { raw = null; }
    }
    state = sanitize(raw);
    return state;
  }

  function save(patch) {
    state = sanitize(Object.assign({}, load(), patch || {}));
    if (canPersist) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota — ignore */ }
    }
    return state;
  }

  function reset() {
    state = null;
    if (canPersist) {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    }
    return load();
  }

  PF.store = { load, save, reset, canPersist };
})(globalThis.PF);
