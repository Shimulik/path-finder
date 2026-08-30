globalThis.PF = globalThis.PF || {};

(function (PF) {
  "use strict";

  const D = PF.data;

  const PREFIX      = "PFS1.";
  const PREFIX_ZIP  = "PFS1Z.";

  /* ---------------- base64url ---------------- */

  function toB64url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function fromB64url(text) {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }



  const canZip = typeof CompressionStream !== "undefined";
  const canUnzip = typeof DecompressionStream !== "undefined";

  async function through(stream, bytes) {
    const piped = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(piped).arrayBuffer());
  }

  /* ---------------- payload ---------------- */

  function pack(state) {
    const mats = {};
    D.MATERIALS.forEach((code, i) => {
      const value = state.mats[i];
      if (value) mats[code] = value;          
    });

    return {
      v:  1,
      m:  mats,
      l:  state.levels,
      sc: state.scale,
      sm: state.showMats  ? 1 : 0,
      aa: state.autoApply ? 1 : 0,
      so: state.sortMode,
      cl: state.customLevel,
      cr: state.customRarity,
      cs: state.customSets,
      th: state.theme
    };
  }


  function unpack(payload) {
    const patch = {};

    if (payload.m && typeof payload.m === "object") {
      patch.mats = D.MATERIALS.map((code) => {
        const n = Number(payload.m[code]);
        return isFinite(n) && n > 0 ? Math.round(n) : 0;
      });
    }
    if (Array.isArray(payload.l))  patch.levels = payload.l.map(String);
    if (payload.sc !== undefined)  patch.scale = Number(payload.sc);
    if (payload.sm !== undefined)  patch.showMats = !!payload.sm;
    if (payload.aa !== undefined)  patch.autoApply = !!payload.aa;
    if (payload.so !== undefined)  patch.sortMode = String(payload.so);
    if (payload.cl !== undefined)  patch.customLevel = String(payload.cl);
    if (payload.cr !== undefined)  patch.customRarity = Number(payload.cr);
    if (Array.isArray(payload.cs)) patch.customSets = payload.cs.map(String);
    if (payload.th !== undefined)  patch.theme = String(payload.th);

    return patch;
  }

  /* ---------------- public ---------------- */

  async function encode(state) {
    const json = JSON.stringify(pack(state));
    const bytes = new TextEncoder().encode(json);

    if (canZip) {
      try {
        const zipped = await through(new CompressionStream("deflate"), bytes);

        if (zipped.length < bytes.length) return PREFIX_ZIP + toB64url(zipped);
      } catch (e) { /* fall through to plain */ }
    }
    return PREFIX + toB64url(bytes);
  }


  async function decode(raw) {
    const code = String(raw || "").trim().replace(/\s+/g, "");
    if (!code) throw new Error("Paste a code first.");

    let body, zipped;
    if (code.indexOf(PREFIX_ZIP) === 0)   { body = code.slice(PREFIX_ZIP.length); zipped = true; }
    else if (code.indexOf(PREFIX) === 0)  { body = code.slice(PREFIX.length);     zipped = false; }
    else throw new Error("That doesn't look like a Path Finder code — they start with PFS1.");

    if (zipped && !canUnzip) {
      throw new Error("This browser can't read compressed codes. Open it in a newer browser.");
    }

    let bytes;
    try {
      bytes = fromB64url(body);
      if (zipped) bytes = await through(new DecompressionStream("deflate"), bytes);
    } catch (e) {
      throw new Error("That code is damaged — it may have been cut short when copied.");
    }

    let payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      throw new Error("That code is damaged — it may have been cut short when copied.");
    }
    if (!payload || typeof payload !== "object") throw new Error("That code is empty.");
    if (Number(payload.v) > 1) {
      throw new Error("That code was made by a newer version of Path Finder. Reload the page and try again.");
    }

    const patch = unpack(payload);


    const missingSets = (patch.customSets || []).filter((id) => !D.SET_BY_ID[id]);

    return { patch, missingSets };
  }

  PF.share = { encode, decode, canZip };
})(globalThis.PF);
