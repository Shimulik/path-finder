globalThis.PF = globalThis.PF || {};

(function (PF) {
  "use strict";

  const D = PF.data;
  const MAT_SET = new Set(D.MATERIALS);

  /* ---------------------------------------------------------------- *
   *  Numbers                                                         *
   * ---------------------------------------------------------------- */


  function parseQuantity(raw, scale) {
    let s = String(raw == null ? "" : raw).trim().replace(/[,_\s]/g, "");
    if (!s) throw new Error("empty value");

    const suffix = s.slice(-1).toUpperCase();
    if (Object.prototype.hasOwnProperty.call(D.SUFFIX_MAP, suffix)) {
      const num = s.slice(0, -1);
      if (!num) throw new Error(`no number before "${suffix}"`);
      const v = Number(num);
      if (!isFinite(v)) throw new Error(`"${raw}" is not a number`);
      return Math.round(v * D.SUFFIX_MAP[suffix]);
    }

    if (scale) {
      const cleaned = s.replace(/[^0-9.]/g, "");
      if (!cleaned) throw new Error(`no numeric value in "${raw}"`);
      const v = Number(cleaned);
      if (!isFinite(v)) throw new Error(`"${raw}" is not a number`);
      return Math.round(v * scale);
    }

    const v = Number(s);
    if (!isFinite(v)) throw new Error(`"${raw}" is not a number`);
    return Math.round(v);
  }

  const int = (n) => Math.round(n).toLocaleString("en-US");

  function compact(value) {
    const abs = Math.abs(value);
    const units = [[1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (const [div, suffix] of units) {
      if (abs >= div) {
        const text = (value / div).toFixed(1).replace(/\.0$/, "");
        return text + suffix;
      }
    }
    return String(Math.round(value));
  }


  function toDisplay(value, scale) {
    if (!scale) return int(value);
    return String(Number((value / scale).toFixed(6)));
  }

  /* ---------------------------------------------------------------- *
   *  Bulk material import                                            *
   * ---------------------------------------------------------------- */

  const MAT_LINE = /^-?\s*([A-Za-z]{1,4})\s*[:=]?\s*(.+?),?$/;

  function parseMatsBlock(text, scale) {
    const values = {};
    const errors = [];
    const lines = String(text || "").split(/\r?\n/);

    const allMatch = String(text || "").trim().match(/^all\s+(\S+)$/i);
    if (allMatch) {
      try {
        const qty = Math.max(0, parseQuantity(allMatch[1], scale));
        D.MATERIALS.forEach((mat) => { values[mat] = qty; });
        return { values, errors };
      } catch (e) {
        return { values, errors: [`Invalid value "${allMatch[1]}" — ${e.message}`] };
      }
    }

    lines.forEach((line) => {
      const raw = line.trim();
      if (!raw || /^!?mats$/i.test(raw) || raw.startsWith("```")) return;

      const m = raw.match(MAT_LINE);
      if (!m) {
        errors.push(`Could not read "${raw}"`);
        return;
      }

      const key = m[1].toUpperCase();
      if (!MAT_SET.has(key)) {
        errors.push(`Unknown material "${m[1]}" — skipped`);
        return;
      }

      try {
        const qty = parseQuantity(m[2], scale);
        if (qty < 0) throw new Error("quantity cannot be negative");
        values[key] = qty;
      } catch (e) {
        errors.push(`${key}: ${e.message}`);
      }
    });

    if (!Object.keys(values).length && !errors.length) {
      errors.push("Nothing to import — paste lines like `BI: 5.7M`");
    }
    return { values, errors };
  }

  PF.format = {
    parseQuantity, int, compact, toDisplay,
    parseMatsBlock
  };
})(globalThis.PF);
