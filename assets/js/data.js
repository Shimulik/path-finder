globalThis.PF = globalThis.PF || {};

(function (PF) {
  "use strict";

  const MATERIALS = ["BI", "CB", "DG", "GH", "HD", "IW", "KW", "LS", "MP", "SK", "WW", "WF"];

  const MATERIAL_INFO = {
    BI: { name: "Black Iron",         icon: "assets/icons/basic_mats/BI.png" },
    CB: { name: "Copper Bar",         icon: "assets/icons/basic_mats/CB.png" },
    DG: { name: "Dragon Glass",       icon: "assets/icons/basic_mats/DG.png" },
    GH: { name: "Golden Heart",       icon: "assets/icons/basic_mats/GH.png" },
    HD: { name: "Hide",               icon: "assets/icons/basic_mats/HD.png" },
    IW: { name: "Ironwood",           icon: "assets/icons/basic_mats/IW.png" },
    KW: { name: "Kingswood",          icon: "assets/icons/basic_mats/KW.png" },
    LS: { name: "Leather Straps",     icon: "assets/icons/basic_mats/LS.png" },
    MP: { name: "Milk of the Poppy",  icon: "assets/icons/basic_mats/MP.png" },
    SK: { name: "Silk",               icon: "assets/icons/basic_mats/SK.png" },
    WW: { name: "Weirwood",           icon: "assets/icons/basic_mats/WW.png" },
    WF: { name: "Wildfire",           icon: "assets/icons/basic_mats/WF.png" }
  };

  const SLOTS = ["Helmet", "Chest", "Pants", "Boots", "Ring", "Weapon"];


  const SUPPORT = {
    url:   "https://buymeacoffee.com/shimulik",                 
    label: "Buy me a coffee",
    icon:  "☕"
  };

  const SET_ART_DIR      = "assets/icons/sets/";
  const SET_ADV_ICON_DIR = "assets/icons/adv/";

  const SET_ADV_ICONS = false;

  const EVENT_LEVEL_COST = {
    "15": 120,
    "20": 400,
    "25": 1200,
    "30": 3000,
    "35": 12000,
    "40": 45000,
    "45": 120000,
    "50": 450000
  };

  const EVENT_HIGH_FROM = 20;

  const EVENT_PIECE_INFO = {};


  function eventSet(id, name, season, advanced, slots, core, extra) {
    const byLevel = {};

    Object.keys(EVENT_LEVEL_COST).forEach((lvl) => {
      const high = Number(lvl) >= EVENT_HIGH_FROM;
      const atLevel = {};

      Object.keys(slots).forEach((slot) => {
        const mats = slots[slot]
          .filter((mat) => high || mat.charAt(0) !== "+")
          .map((mat) => (mat.charAt(0) === "+" ? mat.slice(1) : mat));

        const piece = name + " " + slot;
        atLevel[piece] = [mats, EVENT_LEVEL_COST[lvl]];
        EVENT_PIECE_INFO[piece] = { slot: slot };
      });

      byLevel[lvl] = atLevel;
    });


    if (extra) {
      Object.keys(extra).forEach((lvl) => { byLevel[lvl] = extra[lvl]; });
    }

    return {
      id, name, season, advanced, core: !!core, pieces: byLevel,
      icon:   (SET_ADV_ICONS && advanced) ? SET_ADV_ICON_DIR + id + ".png" : "",
      banner: SET_ART_DIR + id + ".png"
    };
  }

  function tableSet(id, name, season, advanced, table, core) {
    const byLevel = {};
    const seen = {};
    const complain = (n, why, line) =>
      console.warn(`tableSet("${id}") line ${n}: ${why} — skipped\n  ${line}`);

    table.split("\n").forEach((raw, i) => {
      const n = i + 1;

      const line = raw.split("#")[0].trim();
      if (!line) return;

      const col = line.split("|").map((c) => c.trim());
      if (/^level$/i.test(col[0])) return;               
      if (col.length < 4) return complain(n, "needs at least level|slot|piece|materials", line);

      const [lvl, slot, piece, matText, costText] = col;

      if (!/^\d+$/.test(lvl))            return complain(n, `"${lvl}" is not a level`, line);
      if (SLOTS.indexOf(slot) === -1)    return complain(n, `"${slot}" is not a slot`, line);
      if (!piece)                        return complain(n, "piece name is empty", line);

      const mats = matText.split(/[\s,]+/).filter(Boolean);
      const unknown = mats.filter((m) => MATERIALS.indexOf(m) === -1);
      if (!mats.length)                  return complain(n, "no materials listed", line);
      if (unknown.length)                return complain(n, `unknown material ${unknown.join(", ")}`, line);

      let cost = EVENT_LEVEL_COST[lvl];
      if (costText) {
        cost = Number(costText.replace(/[,_]/g, ""));
        if (!isFinite(cost) || cost <= 0) return complain(n, `"${costText}" is not a cost`, line);
      }
      if (cost == null) return complain(n, `no cost for level ${lvl}, and none given`, line);


      const key = lvl + "|" + piece;
      if (seen[key]) return complain(n, `"${piece}" already defined at level ${lvl}`, line);
      seen[key] = true;

      (byLevel[lvl] = byLevel[lvl] || {})[piece] = [mats, cost];
      EVENT_PIECE_INFO[piece] = { slot: slot };
    });

    return {
      id, name, season, advanced, core: !!core, pieces: byLevel,
      icon:   (SET_ADV_ICONS && advanced) ? SET_ADV_ICON_DIR + id + ".png" : "",
      banner: SET_ART_DIR + id + ".png"
    };
  }

  const EVENT_SETS = [
    /* ---- Season 3 ------------------------------------------------------- */

    eventSet("BattleScarred", "Battle-Scarred", "S3", "Battle-Scarred", {
      Helmet: ["WF", "IW", "+LS"],  Chest:  ["IW", "GH", "+LS"],
      Pants:  ["DG", "CB", "+BI"],  Boots:  ["MP", "WF", "+WW"],
      Ring:   ["DG", "SK", "+GH"],  Weapon: ["WW", "KW", "+HD"]
    }),

    eventSet("FalconKnight", "Falcon Knight", "S3", "Falcon Knight", {
      Helmet: ["CB", "BI", "+IW"],  Chest:  ["BI", "CB", "+WW"],
      Pants:  ["SK", "MP", "+DG"],  Boots:  ["MP", "KW", "+WF"],
      Ring:   ["MP", "SK", "+GH"],  Weapon: ["WF", "HD", "+LS"]
    }),

    eventSet("StarkRelics", "Stark Relics", "S3", "Stark Relics", {
      Helmet: ["CB", "KW", "+BI"],  Chest:  ["WW", "CB", "+IW"],
      Pants:  ["IW", "GH", "+DG"],  Boots:  ["HD", "KW", "+WF"],
      Ring:   ["DG", "LS", "+SK"],  Weapon: ["GH", "MP", "+HD"]
    }),

    eventSet("Kingsguard", "Kingsguard", "S3", "Kingsguard", {
      Helmet: ["WF", "WW", "+IW"],  Chest:  ["HD", "BI", "+LS"],
      Pants:  ["DG", "GH", "+LS"],  Boots:  ["SK", "KW", "+WW"],
      Ring:   ["MP", "CB", "+BI"],  Weapon: ["SK", "KW", "+HD"]
    }),

    eventSet("ConquerorsRegalia", "Conqueror's Regalia", "S3", "Conqueror's Regalia", {
      Helmet: ["CB", "HD", "+BI"],  Chest:  ["GH", "DG", "+LS"],
      Pants:  ["KW", "SK", "+MP"],  Boots:  ["WF", "WW", "+IW"],
      Ring:   ["WF", "LS", "+DG"],  Weapon: ["IW", "WW", "+GH"]
    }),

    eventSet("TyrellHighborn", "Tyrell Highborn", "S3", "Tyrell Highborn", {
      Helmet: ["LS", "WF", "+IW"],  Chest:  ["BI", "HD", "+SK"],
      Pants:  ["CB", "DG", "+GH"],  Boots:  ["MP", "KW", "+CB"],
      Ring:   ["HD", "MP", "+SK"],  Weapon: ["KW", "BI", "+WW"]
    }),

    /* ---- Season 4 ------------------------------------------------------- */

    eventSet("Baelish", "Baelish", "S4", "Baelish", {
      Helmet: ["IW", "KW", "+DG"],  Chest:  ["WW", "SK", "+GH"],
      Pants:  ["LS", "CB", "+WF"],  Boots:  ["WF", "MP", "+LS"],
      Ring:   ["GH", "HD", "+WW"],  Weapon: ["DG", "BI", "+IW"]
    }),

    eventSet("ThornedBride", "Thorned Bride", "S4", "Thorned Bride", {
      Helmet: ["WW", "WF", "+DG"],  Chest:  ["HD", "SK", "+BI"],
      Pants:  ["LS", "IW", "+MP"],  Boots:  ["MP", "KW", "+CB"],
      Ring:   ["KW", "HD", "+BI"],  Weapon: ["GH", "CB", "+SK"]
    }),

    eventSet("FacelessMen", "Faceless Men", "S4", "Faceless Men", {
      Helmet: ["MP", "KW", "+SK"],  Chest:  ["GH", "DG", "+IW"],
      Pants:  ["HD", "CB", "+BI"],  Boots:  ["LS", "WF", "+WW"],
      Ring:   ["DG", "LS", "+WF"],  Weapon: ["GH", "IW", "+WW"]
    }),

    eventSet("Dragonkeeper", "Dragonkeeper", "S4", "Dragonkeeper", {
      Helmet: ["HD", "IW", "+KW"],  Chest:  ["CB", "SK", "+KW"],
      Pants:  ["SK", "BI", "+CB"],  Boots:  ["GH", "MP", "+WW"],
      Ring:   ["BI", "HD", "+MP"],  Weapon: ["IW", "WF", "+DG"]
    }),

    eventSet("BrotherhoodArcher", "Brotherhood Archer", "S4", "Brotherhood Archer", {
      Helmet: ["LS", "CB", "+HD"],  Chest:  ["MP", "WW", "+KW"],
      Pants:  ["GH", "WF", "+DG"],  Boots:  ["LS", "SK", "+BI"],
      Ring:   ["IW", "BI", "+WW"],  Weapon: ["LS", "DG", "+SK"]
    }),

    eventSet("BlackwaterDefender", "Blackwater Defender", "S4", "Blackwater Defender", {
      Helmet: ["WF", "IW", "+CB"],  Chest:  ["GH", "WW", "+SK"],
      Pants:  ["HD", "LS", "+MP"],  Boots:  ["KW", "WF", "+HD"],
      Ring:   ["CB", "GH", "+BI"],  Weapon: ["MP", "DG", "+KW"]
    }),

    eventSet("Usurper", "Usurper", "S4", "Usurper", {
      Helmet: ["IW", "MP", "+GH"],  Chest:  ["WW", "CB", "+DG"],
      Pants:  ["DG", "SK", "+IW"],  Boots:  ["WF", "KW", "+LS"],
      Ring:   ["GH", "HD", "+WF"],  Weapon: ["LS", "BI", "+WW"]
    }),

    /* ---- Season 5 ------------------------------------------------------- */

    eventSet("DornishRoyal", "Dornish Royal", "S5", "Dornish Royal", {
      Helmet: ["GH", "DG", "+LS"],  Chest:  ["CB", "BI", "+HD"],
      Pants:  ["MP", "IW", "+KW"],  Boots:  ["MP", "KW", "+SK"],
      Ring:   ["HD", "SK", "+WW"],  Weapon: ["WF", "CB", "+BI"]
    }),

    eventSet("LostRanger", "Lost Ranger", "S5", "Lost Ranger", {
      Helmet: ["GH", "SK", "+KW"],  Chest:  ["WW", "CB", "+MP"],
      Pants:  ["IW", "WF", "+SK"],  Boots:  ["LS", "DG", "+BI"],
      Ring:   ["WF", "MP", "+HD"],  Weapon: ["WW", "DG", "+IW"]
    }),

    eventSet("CrowSlayer", "Crow Slayer", "S5", "Crow Slayer", {
      Helmet: ["BI", "WW", "+SK"],  Chest:  ["KW", "CB", "+LS"],
      Pants:  ["LS", "MP", "+GH"],  Boots:  ["GH", "BI", "+HD"],
      Ring:   ["KW", "CB", "+DG"],  Weapon: ["IW", "HD", "+WF"]
    }),

    eventSet("KeepArchitect", "Keep Architect", "S5", "Keep Architect", {
      Helmet: ["IW", "MP", "+LS"],  Chest:  ["WW", "HD", "+SK"],
      Pants:  ["DG", "KW", "+IW"],  Boots:  ["BI", "WW", "+CB"],
      Ring:   ["SK", "WF", "+BI"],  Weapon: ["LS", "GH", "+DG"]
    }),

    eventSet("WarHound", "War Hound", "S5", "War Hound", {
      Helmet: ["KW", "GH", "+CB"],  Chest:  ["CB", "WF", "+MP"],
      Pants:  ["WW", "IW", "+SK"],  Boots:  ["KW", "HD", "+MP"],
      Ring:   ["GH", "BI", "+HD"],  Weapon: ["DG", "LS", "+WF"]
    }),

    eventSet("TourneyQueen", "Tourney Queen", "S5", "Tourney Queen", {
      Helmet: ["HD", "CB", "+KW"],  Chest:  ["IW", "DG", "+LS"],
      Pants:  ["LS", "MP", "+GH"],  Boots:  ["BI", "SK", "+WW"],
      Ring:   ["WF", "WW", "+BI"],  Weapon: ["SK", "IW", "+DG"]
    }),

    eventSet("FieryZealot", "Fiery Zealot", "S5", "Fiery Zealot", {
      Helmet: ["WW", "BI", "+SK"],  Chest:  ["KW", "WF", "+MP"],
      Pants:  ["DG", "LS", "+IW"],  Boots:  ["CB", "GH", "+HD"],
      Ring:   ["GH", "HD", "+WF"],  Weapon: ["MP", "KW", "+CB"]
    }),

    /* ---- Season 6 ------------------------------------------------------- */

    eventSet("LionQueen", "Lion Queen", "S6", "Lion Queen", {
      Helmet: ["KW", "BI", "+IW"],  Chest:  ["CB", "WF", "+SK"],
      Pants:  ["WW", "LS", "+WF"],  Boots:  ["MP", "GH", "+HD"],
      Ring:   ["DG", "HD", "+MP"],  Weapon: ["GH", "KW", "+CB"]
    }),

    eventSet("DrownedDisciple", "Drowned Disciple", "S6", "Drowned Disciple", {
      Helmet: ["HD", "MP", "+GH"],  Chest:  ["WW", "LS", "+DG"],
      Pants:  ["IW", "CB", "+KW"],  Boots:  ["SK", "BI", "+IW"],
      Ring:   ["BI", "SK", "+LS"],  Weapon: ["WF", "DG", "+WW"]
    }),

    eventSet("UnleashedWarrior", "Unleashed Warrior", "S6", "Unleashed Warrior", {
      Helmet: ["LS", "WW", "+BI"],  Chest:  ["MP", "CB", "+HD"],
      Pants:  ["DG", "IW", "+SK"],  Boots:  ["KW", "GH", "+WF"],
      Ring:   ["GH", "HD", "+MP"],  Weapon: ["CB", "WF", "+KW"]
    }),

    eventSet("Crannogman", "Crannogman", "S6", "Crannogman", {
      Helmet: ["MP", "CB", "+HD"],  Chest:  ["WF", "SK", "+BI"],
      Pants:  ["WW", "IW", "+KW"],  Boots:  ["LS", "GH", "+DG"],
      Ring:   ["KW", "SK", "+MP"],  Weapon: ["WW", "GH", "+DG"]
    }),

    eventSet("NorthernGuardian", "Northern Guardian", "S6", "Northern Guardian", {
      Helmet: ["WW", "IW", "+CB"],  Chest:  ["BI", "CB", "+HD"],
      Pants:  ["HD", "MP", "+KW"],  Boots:  ["WF", "LS", "+IW"],
      Ring:   ["DG", "BI", "+SK"],  Weapon: ["GH", "LS", "+WF"]
    }),

    eventSet("RimedRevenant", "Rimed Revenant", "S6", "Rimed Revenant", {
      Helmet: ["CB", "IW", "+DG"],  Chest:  ["HD", "GH", "+BI"],
      Pants:  ["SK", "WW", "+KW"],  Boots:  ["LS", "WF", "+MP"],
      Ring:   ["KW", "DG", "+SK"],  Weapon: ["MP", "BI", "+WF"]
    }),

    eventSet("HighgardenSocialite", "Highgarden Socialite", "S6", "Highgarden Socialite", {
      Helmet: ["BI", "SK", "+DG"],  Chest:  ["IW", "HD", "+CB"],
      Pants:  ["HD", "LS", "+IW"],  Boots:  ["WW", "GH", "+LS"],
      Ring:   ["KW", "MP", "+WW"],  Weapon: ["WF", "CB", "+GH"]
    }),

    /* ---- Season 7 ------------------------------------------------------- */

    eventSet("IronbornCaptain", "Ironborn Captain", "S7", "Ironborn Captain", {
      Helmet: ["IW", "GH", "+CB"],  Chest:  ["CB", "MP", "+WF"],
      Pants:  ["MP", "BI", "+HD"],  Boots:  ["SK", "DG", "+KW"],
      Ring:   ["WW", "KW", "+LS"],  Weapon: ["GH", "WF", "+DG"]
    }),

    eventSet("LaughingKnight", "Laughing Knight", "S7", "Laughing Knight", {
      Helmet: ["BI", "LS", "+SK"],  Chest:  ["HD", "IW", "+WW"],
      Pants:  ["DG", "WW", "+WF"],  Boots:  ["LS", "SK", "+BI"],
      Ring:   ["IW", "HD", "+GH"],  Weapon: ["KW", "CB", "+MP"]
    }),

    eventSet("Citadel", "Citadel", "S7", "Citadel", {
      Helmet: ["DG", "KW", "+HD"],  Chest:  ["SK", "IW", "+CB"],
      Pants:  ["WF", "GH", "+SK"],  Boots:  ["HD", "BI", "+LS"],
      Ring:   ["LS", "DG", "+BI"],  Weapon: ["WW", "MP", "+IW"]
    }),

    eventSet("Fledgling", "Fledgling", "S7", "Fledgling", {
      Helmet: ["CB", "SK", "+LS"],  Chest:  ["MP", "HD", "+KW"],
      Pants:  ["BI", "WF", "+WW"],  Boots:  ["GH", "LS", "+WF"],
      Ring:   ["WW", "CB", "+MP"],  Weapon: ["DG", "IW", "+GH"]
    }),

    eventSet("WinterSurvivor", "Winter Survivor", "S7", "Winter Survivor", {
      Helmet: ["IW", "KW", "+HD"],  Chest:  ["SK", "WW", "+DG"],
      Pants:  ["WF", "MP", "+CB"],  Boots:  ["KW", "LS", "+BI"],
      Ring:   ["HD", "GH", "+SK"],  Weapon: ["DG", "BI", "+WW"]
    }),

    eventSet("StormLord", "Storm Lord", "S7", "Storm Lord", {
      Helmet: ["MP", "KW", "+SK"],  Chest:  ["GH", "LS", "+WW"],
      Pants:  ["IW", "HD", "+KW"],  Boots:  ["BI", "SK", "+HD"],
      Ring:   ["GH", "CB", "+IW"],  Weapon: ["DG", "WF", "+BI"]
    }),

    eventSet("IronKeyholder", "Iron Keyholder", "S7", "Iron Keyholder", {
      Helmet: ["SK", "BI", "+DG"],  Chest:  ["KW", "MP", "+WF"],
      Pants:  ["HD", "WW", "+LS"],  Boots:  ["IW", "DG", "+CB"],
      Ring:   ["WF", "KW", "+CB"],  Weapon: ["MP", "GH", "+IW"]
    }),

    /* ---- Season 8 ------------------------------------------------------- */

    eventSet("TargRoyal", "Targ Royal", "S8", "Targ Royal", {
      Helmet: ["LS", "CB", "+KW"],  Chest:  ["DG", "IW", "+HD"],
      Pants:  ["GH", "WF", "+MP"],  Boots:  ["BI", "SK", "+WW"],
      Ring:   ["HD", "WW", "+LS"],  Weapon: ["SK", "DG", "+BI"]
    }),

    eventSet("ValChampion", "Val Champion", "S8", "Val Champion", {
      Helmet: ["WW", "BI", "+SK"],  Chest:  ["IW", "KW", "+WF"],
      Pants:  ["DG", "LS", "+HD"],  Boots:  ["CB", "MP", "+GH"],
      Ring:   ["KW", "WF", "+MP"],  Weapon: ["GH", "IW", "+CB"]
    }),

    eventSet("FestivalCarouser", "Festival Carouser", "S8", "Festival Carouser", {
      Helmet: ["MP", "SK", "+WW"],  Chest:  ["BI", "GH", "+DG"],
      Pants:  ["WF", "CB", "+IW"],  Boots:  ["LS", "HD", "+KW"],
      Ring:   ["SK", "WW", "+BI"],  Weapon: ["HD", "DG", "+LS"]
    }),

    eventSet("DragonRider", "Dragon Rider", "S8", "Dragon Rider", {
      Helmet: ["WF", "DG", "+MP"],  Chest:  ["KW", "CB", "+GH"],
      Pants:  ["IW", "WF", "+CB"],  Boots:  ["MP", "KW", "+IW"],
      Ring:   ["WW", "BI", "+SK"],  Weapon: ["HD", "GH", "+LS"]
    }),

    eventSet("ValBloodmage", "Val Bloodmage", "S8", "Val Bloodmage", {
      Helmet: ["CB", "DG", "+GH"],  Chest:  ["BI", "HD", "+IW"],
      Pants:  ["MP", "SK", "+WF"],  Boots:  ["KW", "LS", "+WW"],
      Ring:   ["HD", "CB", "+DG"],  Weapon: ["WF", "MP", "+KW"]
    }),

    eventSet("LivingMountain", "Living Mountain", "S8", "Living Mountain", {
      Helmet: ["KW", "HD", "+CB"],  Chest:  ["LS", "BI", "+GH"],
      Pants:  ["DG", "SK", "+BI"],  Boots:  ["SK", "WW", "+IW"],
      Ring:   ["GH", "MP", "+WW"],  Weapon: ["IW", "WF", "+LS"]
    }),

    eventSet("NorthernNoble", "Northern Noble", "S8", "Northern Noble", {
      Helmet: ["WW", "IW", "+DG"],  Chest:  ["CB", "HD", "+BI"],
      Pants:  ["LS", "WF", "+CB"],  Boots:  ["MP", "SK", "+KW"],
      Ring:   ["GH", "BI", "+HD"],  Weapon: ["SK", "KW", "+MP"]
    }),

    /* ---- Season 9 ------------------------------------------------------- */

    eventSet("LostTarg", "Lost Targ", "S9", "Lost Targ", {
      Helmet: ["WW", "SK", "+WF"],  Chest:  ["HD", "BI", "+LS"],
      Pants:  ["GH", "CB", "+LS"],  Boots:  ["CB", "MP", "+KW"],
      Ring:   ["WF", "MP", "+KW"],  Weapon: ["IW", "DG", "+BI"]
    }),

    eventSet("TargKingsguard", "Targ Kingsguard", "S9", "Targ Kingsguard", {
      Helmet: ["CB", "IW", "+WF"],  Chest:  ["HD", "GH", "+DG"],
      Pants:  ["LS", "KW", "+HD"],  Boots:  ["SK", "WW", "+IW"],
      Ring:   ["BI", "SK", "+MP"],  Weapon: ["DG", "GH", "+WW"]
    }),

    eventSet("Chainbreaker", "Chainbreaker", "S9", "Chainbreaker", {
      Helmet: ["IW", "LS", "+CB"],  Chest:  ["GH", "HD", "+BI"],
      Pants:  ["DG", "MP", "+GH"],  Boots:  ["WF", "WW", "+SK"],
      Ring:   ["KW", "DG", "+LS"],  Weapon: ["CB", "IW", "+BI"]
    }),

    eventSet("Rhoynish", "Rhoynish", "S9", "Rhoynish", {
      Helmet: ["SK", "WF", "+HD"],  Chest:  ["IW", "DG", "+MP"],
      Pants:  ["HD", "MP", "+IW"],  Boots:  ["WF", "LS", "+WW"],
      Ring:   ["KW", "WW", "+SK"],  Weapon: ["GH", "CB", "+BI"]
    }),

    eventSet("FacelessWolf", "Faceless Wolf", "S9", "Faceless Wolf", {
      Helmet: ["SK", "DG", "+MP"],  Chest:  ["BI", "SK", "+HD"],
      Pants:  ["GH", "WF", "+WW"],  Boots:  ["KW", "WW", "+LS"],
      Ring:   ["CB", "MP", "+BI"],  Weapon: ["WF", "IW", "+KW"]
    }),

    eventSet("Thenn", "Thenn", "S9", "Thenn", {
      Helmet: ["WW", "BI", "+LS"],  Chest:  ["HD", "KW", "+CB"],
      Pants:  ["DG", "HD", "+SK"],  Boots:  ["LS", "GH", "+DG"],
      Ring:   ["MP", "CB", "+IW"],  Weapon: ["KW", "WF", "+GH"]
    }),

    eventSet("HarvestFool", "Harvest Fool", "S9", "Harvest Fool", {
      Helmet: ["GH", "BI", "+WW"],  Chest:  ["SK", "HD", "+WF"],
      Pants:  ["KW", "LS", "+IW"],  Boots:  ["DG", "CB", "+MP"],
      Ring:   ["WF", "DG", "+LS"],  Weapon: ["BI", "WW", "+HD"]
    }),

    /* ---- Season 10 ------------------------------------------------------ */

    eventSet("Fishmonger", "Fishmonger", "S10", "Fishmonger", {
      Helmet: ["HD", "DG", "+GH"],  Chest:  ["SK", "GH", "+BI"],
      Pants:  ["WW", "SK", "+MP"],  Boots:  ["LS", "KW", "+WF"],
      Ring:   ["CB", "IW", "+KW"],  Weapon: ["MP", "CB", "+IW"]
    }),

    eventSet("TourneyHerald", "Tourney Herald", "S10", "Tourney Herald", {
      Helmet: ["KW", "MP", "+DG"],  Chest:  ["IW", "HD", "+SK"],
      Pants:  ["GH", "WF", "+CB"],  Boots:  ["WW", "BI", "+LS"],
      Ring:   ["BI", "WW", "+LS"],  Weapon: ["SK", "IW", "+HD"]
    }),

    eventSet("Umber", "Umber", "S10", "Umber", {
      Helmet: ["SK", "DG", "+MP"],  Chest:  ["DG", "CB", "+HD"],
      Pants:  ["GH", "WF", "+WW"],  Boots:  ["KW", "GH", "+LS"],
      Ring:   ["CB", "MP", "+BI"],  Weapon: ["WF", "IW", "+KW"]
    }),

    eventSet("StagLord", "Stag Lord", "S10", "Stag Lord", {
      Helmet: ["KW", "CB", "+MP"],  Chest:  ["DG", "MP", "+HD"],
      Pants:  ["HD", "WF", "+WW"],  Boots:  ["SK", "GH", "+LS"],
      Ring:   ["CB", "LS", "+BI"],  Weapon: ["BI", "IW", "+KW"]
    }),

    eventSet("TideLord", "Tide Lord", "S10", "Tide Lord", {
      Helmet: ["GH", "CB", "+SK"],  Chest:  ["IW", "MP", "+WF"],
      Pants:  ["WF", "HD", "+DG"],  Boots:  ["SK", "LS", "+IW"],
      Ring:   ["DG", "KW", "+WW"],  Weapon: ["WW", "BI", "+GH"]
    }),

    eventSet("DragonHeiress", "Dragon Heiress", "S10", "Dragon Heiress", {
      Helmet: ["WW", "DG", "+IW"],  Chest:  ["LS", "GH", "+BI"],
      Pants:  ["CB", "SK", "+KW"],  Boots:  ["SK", "KW", "+WF"],
      Ring:   ["HD", "IW", "+MP"],  Weapon: ["MP", "CB", "+GH"]
    }),

    eventSet("QueenMother", "Queen Mother", "S10", "Queen Mother", {
      Helmet: ["WF", "SK", "+DG"],  Chest:  ["BI", "GH", "+WF"],
      Pants:  ["WW", "BI", "+LS"],  Boots:  ["LS", "KW", "+HD"],
      Ring:   ["DG", "CB", "+IW"],  Weapon: ["IW", "MP", "+WW"]
    }),

    /* ---- Season 11 ------------------------------------------------------ */

    eventSet("FlameReaver", "Flame Reaver", "S11", "Flame Reaver", {
      Helmet: ["SK", "WW", "+DG"],  Chest:  ["MP", "KW", "+LS"],
      Pants:  ["KW", "GH", "+BI"],  Boots:  ["HD", "SK", "+WF"],
      Ring:   ["CB", "BI", "+WF"],  Weapon: ["HD", "MP", "+LS"]
    }),

    eventSet("Frostbitten", "Frostbitten", "S11", "Frostbitten", {
      Helmet: ["WW", "BI", "+KW"],  Chest:  ["CB", "HD", "+SK"],
      Pants:  ["GH", "IW", "+WF"],  Boots:  ["IW", "LS", "+MP"],
      Ring:   ["DG", "WW", "+CB"],  Weapon: ["HD", "DG", "+GH"]
    }),

    eventSet("KnightOfFlowers", "Knight of Flowers", "S11", "Knight of Flowers", {
      Helmet: ["WW", "MP", "+HD"],  Chest:  ["BI", "GH", "+LS"],
      Pants:  ["HD", "CB", "+WW"],  Boots:  ["LS", "DG", "+BI"],
      Ring:   ["IW", "SK", "+WF"],  Weapon: ["WF", "KW", "+IW"]
    }),

    eventSet("Greenfyre", "Greenfyre", "S11", "Greenfyre", {
      Helmet: ["KW", "WW", "+SK"],  Chest:  ["SK", "BI", "+GH"],
      Pants:  ["CB", "IW", "+KW"],  Boots:  ["MP", "LS", "+DG"],
      Ring:   ["DG", "HD", "+MP"],  Weapon: ["GH", "WF", "+CB"]
    }),

    eventSet("FrozenStark", "Frozen Stark", "S11", "Frozen Stark", {
      Helmet: ["IW", "DG", "+LS"],  Chest:  ["LS", "CB", "+HD"],
      Pants:  ["BI", "WF", "+MP"],  Boots:  ["WW", "GH", "+IW"],
      Ring:   ["HD", "KW", "+BI"],  Weapon: ["MP", "SK", "+WW"]
    }),

    eventSet("FlameLitLannister", "Flame Lit Lannister", "S11", "Flame Lit Lannister", {
      Helmet: ["CB", "WW", "+KW"],  Chest:  ["GH", "BI", "+DG"],
      Pants:  ["SK", "MP", "+WF"],  Boots:  ["DG", "LS", "+SK"],
      Ring:   ["WF", "HD", "+CB"],  Weapon: ["KW", "IW", "+GH"]
    }),

    eventSet("OneEyed", "One Eyed", "S11", "One Eyed", {
      Helmet: ["WW", "KW", "+IW"],  Chest:  ["LS", "SK", "+BI"],
      Pants:  ["HD", "MP", "+WW"],  Boots:  ["BI", "WF", "+LS"],
      Ring:   ["IW", "CB", "+HD"],  Weapon: ["DG", "GH", "+WF"]
    }),

    /* ---- Season 12 ------------------------------------------------------ */

    eventSet("ChilledCorsair", "Chilled Corsair", "S12", "Chilled Corsair", {
      Helmet: ["SK", "WW", "+CB"],  Chest:  ["DG", "BI", "+SK"],
      Pants:  ["MP", "WF", "+KW"],  Boots:  ["GH", "LS", "+MP"],
      Ring:   ["KW", "IW", "+GH"],  Weapon: ["CB", "HD", "+DG"]
    }),

    eventSet("BurningUsurper", "Burning Usurper", "S12", "Burning Usurper", {
      Helmet: ["WW", "DG", "+HD"],  Chest:  ["BI", "GH", "+WF"],
      Pants:  ["IW", "MP", "+WW"],  Boots:  ["LS", "CB", "+IW"],
      Ring:   ["HD", "SK", "+BI"],  Weapon: ["WF", "KW", "+LS"]
    }),

    eventSet("Dragonflame", "Dragonflame", "S12", "Dragonflame", {
      Helmet: ["WF", "KW", "+CB"],  Chest:  ["BI", "SK", "+DG"],
      Pants:  ["LS", "CB", "+MP"],  Boots:  ["HD", "MP", "+GH"],
      Ring:   ["GH", "WW", "+SK"],  Weapon: ["DG", "IW", "+KW"]
    }),

    eventSet("GoldenRose", "Golden Rose", "S12", "Golden Rose", {
      Helmet: ["KW", "MP", "+IW"],  Chest:  ["HD", "IW", "+WW"],
      Pants:  ["SK", "CB", "+HD"],  Boots:  ["WW", "LS", "+BI"],
      Ring:   ["DG", "WF", "+LS"],  Weapon: ["BI", "GH", "+WF"]
    }),

    eventSet("ScorchedDornish", "Scorched Dornish", "S12", "Scorched Dornish", {
      Helmet: ["MP", "LS", "+CB"],  Chest:  ["GH", "WW", "+DG"],
      Pants:  ["CB", "HD", "+GH"],  Boots:  ["DG", "BI", "+SK"],
      Ring:   ["SK", "WF", "+KW"],  Weapon: ["KW", "IW", "+MP"]
    }),

    eventSet("FrostfangThenn", "Frostfang Thenn", "S12", "Frostfang Thenn", {
      Helmet: ["LS", "CB", "+BI"],  Chest:  ["HD", "WF", "+LS"],
      Pants:  ["IW", "MP", "+WW"],  Boots:  ["BI", "GH", "+KW"],
      Ring:   ["WW", "GH", "+HD"],  Weapon: ["DG", "SK", "+IW"]
    }),

    eventSet("TyrellFireborn", "Tyrell Fireborn", "S12", "Tyrell Fireborn", {
      Helmet: ["WW", "LS", "+MP"],  Chest:  ["CB", "HD", "+SK"],
      Pants:  ["MP", "DG", "+GH"],  Boots:  ["WF", "BI", "+KW"],
      Ring:   ["SK", "IW", "+DG"],  Weapon: ["KW", "WF", "+CB"]
    }),

    /* ---- Season 13 ------------------------------------------------------ */

    eventSet("ValorousKingsguard", "Valorous Kingsguard", "S13", "Valorous Kingsguard", {
      Helmet: ["MP", "WF", "+WW"],  Chest:  ["HD", "GH", "+IW"],
      Pants:  ["DG", "SK", "+BI"],  Boots:  ["LS", "CB", "+GH"],
      Ring:   ["WF", "CB", "+MP"],  Weapon: ["BI", "KW", "+DG"]
    }),

    eventSet("LaughingBaratheon", "Laughing Baratheon", "S13", "Laughing Baratheon", {
      Helmet: ["IW", "CB", "+KW"],  Chest:  ["KW", "MP", "+LS"],
      Pants:  ["HD", "BI", "+WW"],  Boots:  ["WW", "SK", "+HD"],
      Ring:   ["LS", "DG", "+IW"],  Weapon: ["SK", "WF", "+GH"]
    }),

    eventSet("HedgeKnight", "Hedge Knight", "S13", "Hedge Knight", {
      Helmet: ["BI", "SK", "+LS"],  Chest:  ["HD", "DG", "+BI"],
      Pants:  ["KW", "MP", "+WW"],  Boots:  ["LS", "GH", "+IW"],
      Ring:   ["WW", "WF", "+HD"],  Weapon: ["IW", "CB", "+KW"]
    }),

    eventSet("RagingDothraki", "Raging Dothraki", "S13", "Raging Dothraki", {
      Helmet: ["DG", "WW", "+WF"],  Chest:  ["MP", "BI", "+SK"],
      Pants:  ["GH", "HD", "+DG"],  Boots:  ["CB", "LS", "+MP"],
      Ring:   ["SK", "IW", "+GH"],  Weapon: ["WF", "KW", "+CB"]
    }),

    eventSet("CleansedFaith", "Cleansed Faith", "S13", "Cleansed Faith", {
      Helmet: ["BI", "DG", "+WW"],  Chest:  ["IW", "WF", "+KW"],
      Pants:  ["WW", "GH", "+HD"],  Boots:  ["KW", "MP", "+IW"],
      Ring:   ["HD", "SK", "+LS"],  Weapon: ["LS", "CB", "+BI"]
    }),

    eventSet("LionOfTheWest", "Lion of the West", "S13", "Lion of the West", {
      Helmet: ["CB", "LS", "+WF"],  Chest:  ["GH", "WW", "+MP"],
      Pants:  ["WF", "HD", "+DG"],  Boots:  ["DG", "KW", "+SK"],
      Ring:   ["SK", "BI", "+GH"],  Weapon: ["MP", "IW", "+CB"]
    }),

    eventSet("BlazingChamp", "Blazing Champ", "S13", "Blazing Champ", {
      Helmet: ["WW", "SK", "+KW"],  Chest:  ["BI", "GH", "+WW"],
      Pants:  ["KW", "MP", "+HD"],  Boots:  ["LS", "CB", "+IW"],
      Ring:   ["IW", "DG", "+BI"],  Weapon: ["HD", "WF", "+LS"]
    }),

    /* ---- Season 14 ------------------------------------------------------ */

    eventSet("Dragonseed", "Dragonseed", "S14", "Dragonseed", {
      Helmet: ["DG", "HD", "+SK"],  Chest:  ["SK", "KW", "+MP"],
      Pants:  ["CB", "BI", "+GH"],  Boots:  ["GH", "LS", "+WF"],
      Ring:   ["MP", "WW", "+CB"],  Weapon: ["WF", "IW", "+DG"]
    }),

  ];



  const SETS = [
    tableSet("ctw", "CTW", "S3", "", `
      level | slot   | piece      | materials      | cost
      # ---- Level 1 ----
      1     | Helmet | CTW Helmet | SK BI CB       | 6
      1     | Chest  | CTW Chest  | MP HD IW       | 6
      1     | Pants  | CTW Pants  | KW WF HD       | 6
      1     | Boots  | CTW Boots  | IW GH WF       | 6
      1     | Ring   | CTW Ring   | WW LS BI       | 6
      1     | Weapon | CTW Weapon | IW GH WF       | 6   

      # ---- Level 5 ----
      5     | Helmet | CTW Helmet | KW WF HD       | 10
      5     | Chest  | CTW Chest  | SK BI CB       | 10
      5     | Pants  | CTW Pants  | WW LS BI       | 10
      5     | Boots  | CTW Boots  | MP HD IW       | 10
      5     | Ring   | CTW Ring   | IW GH WF       | 10
      5     | Weapon | CTW Weapon | CB DG LS       | 10

      # ---- Level 10 ----
      10    | Helmet | CTW Helmet | KW WF HD       | 20
      10    | Chest  | CTW Chest  | SK BI CB       | 20
      10    | Pants  | CTW Pants  | WW LS BI       | 20
      10    | Boots  | CTW Boots  | MP HD IW       | 20
      10    | Ring   | CTW Ring   | IW GH WF       | 20
      10    | Weapon | CTW Weapon | CB DG LS       | 20

      # ---- Level 15 ----
      15    | Helmet | CTW Helmet | KW WF HD       | 120
      15    | Chest  | CTW Chest  | SK BI CB       | 120
      15    | Pants  | CTW Pants  | WW LS BI       | 120
      15    | Boots  | CTW Boots  | MP HD IW       | 120
      15    | Ring   | CTW Ring   | IW GH WF       | 120
      15    | Weapon | CTW Weapon | CB DG LS       | 120

      # ---- Level 20 ----
      20    | Helmet | CTW Helmet | KW WF HD       | 400
      20    | Chest  | CTW Chest  | SK BI CB       | 400
      20    | Pants  | CTW Pants  | WW LS BI       | 400
      20    | Boots  | CTW Boots  | MP HD IW       | 400
      20    | Ring   | CTW Ring   | IW GH WF       | 400
      20    | Weapon | CTW Weapon | CB DG LS       | 400

      # ---- Level 25 ----
      25    | Helmet | CTW Helmet | KW WF HD MP    | 1200
      25    | Chest  | CTW Chest  | SK BI CB DG    | 1200
      25    | Pants  | CTW Pants  | WW LS BI SK    | 1200
      25    | Boots  | CTW Boots  | MP HD IW GH    | 1200
      25    | Ring   | CTW Ring   | IW GH WF KW    | 1200
      25    | Weapon | CTW Weapon | CB DG LS WW    | 1200

      # ---- Level 30 ----
      30    | Helmet | CTW Helmet | KW WF HD MP    | 3000
      30    | Chest  | CTW Chest  | SK BI CB DG    | 3000
      30    | Pants  | CTW Pants  | WW LS BI SK    | 3000
      30    | Boots  | CTW Boots  | MP HD IW GH    | 3000
      30    | Ring   | CTW Ring   | IW GH WF KW    | 3000
      30    | Weapon | CTW Weapon | CB DG LS WW    | 3000

      # ---- Level 35 ----
      35    | Helmet | CTW Helmet | KW WF HD MP    | 12000
      35    | Chest  | CTW Chest  | SK BI CB DG    | 12000
      35    | Pants  | CTW Pants  | WW LS BI SK    | 12000
      35    | Boots  | CTW Boots  | MP HD IW GH    | 12000
      35    | Ring   | CTW Ring   | IW GH WF KW    | 12000
      35    | Weapon | CTW Weapon | CB DG LS WW    | 12000

      # ---- Level 40 ----
      40    | Helmet | CTW Helmet | KW WF HD MP    | 45000
      40    | Chest  | CTW Chest  | SK BI CB DG    | 45000
      40    | Pants  | CTW Pants  | WW LS BI SK    | 45000
      40    | Boots  | CTW Boots  | MP HD IW GH    | 45000
      40    | Ring   | CTW Ring   | IW GH WF KW    | 45000
      40    | Weapon | CTW Weapon | CB DG LS WW    | 45000

      # ---- Level 45 ----
      45    | Helmet | CTW Helmet | KW WF HD MP    | 120000
      45    | Chest  | CTW Chest  | SK BI CB DG    | 120000
      45    | Pants  | CTW Pants  | WW LS BI SK    | 120000
      45    | Boots  | CTW Boots  | MP HD IW GH    | 120000
      45    | Ring   | CTW Ring   | IW GH WF KW    | 120000
      45    | Weapon | CTW Weapon | CB DG LS WW    | 120000

      # ---- Level 50 ----
      50    | Helmet | CTW Helmet | KW WF HD MP    | 450000
      50    | Chest  | CTW Chest  | SK BI CB DG    | 450000
      50    | Pants  | CTW Pants  | WW LS BI SK    | 450000
      50    | Boots  | CTW Boots  | MP HD IW GH    | 450000
      50    | Ring   | CTW Ring   | IW GH WF KW    | 450000
      50    | Weapon | CTW Weapon | CB DG LS WW    | 450000
    `, true),

    tableSet("basic", "Basic", "S0", "", `
      level | slot   | piece                     | materials      | cost
      # ---- Level 15 ----
      15    | Helmet | Iron Skullcap             | BI LS          | 180
      15    | Helmet | Mushroom Cap              | WF WW          | 180
      15    | Helmet | Steel Gorget              | BI MP          | 180
      15    | Chest  | Bronze Chain Shirt        | CB HD          | 180
      15    | Chest  | Charred Leathers          | LS WF          | 180
      15    | Chest  | Lab Smock                 | WF SK          | 180
      15    | Pants  | Copper Culet              | CB WF          | 180
      15    | Pants  | Leather Kilt              | HD KW          | 180
      15    | Pants  | Leather Schynbalds        | LS IW          | 180
      15    | Boots  | Riding Boots              | LS KW          | 180
      15    | Boots  | Steel-Toed Stompers       | BI GH WW       | 120
      15    | Boots  | Well-Heeled Shoes         | WW SK DG       | 120
      15    | Ring   | Amethyst Embrace          | DG SK          | 180
      15    | Ring   | Silver Band               | IW MP          | 180
      15    | Ring   | Tiger's Eye               | DG KW          | 180
      15    | Weapon | Flatbow                   | GH MP          | 180
      15    | Weapon | Pike                      | GH HD          | 180
      15    | Weapon | Shortsword                | IW CB          | 180

      # ---- Level 20 ----
      20    | Helmet | Half Helm                 | CB IW          | 600
      20    | Helmet | Turban                    | SK LS          | 600
      20    | Helmet | Wool Coif                 | HD WF          | 600
      20    | Chest  | Copper Chain Shirt        | CB LS          | 600
      20    | Chest  | Iron Chain Shirt          | BI LS          | 600
      20    | Chest  | Merchants Doublet         | SK DG          | 600
      20    | Pants  | Leather Chaps             | LS GH          | 600
      20    | Pants  | Wooden Poleyns            | GH KW          | 600
      20    | Pants  | Wool Skirt                | HD LS          | 600
      20    | Boots  | Boots of War              | WW IW          | 600
      20    | Boots  | Sand Stompers             | LS DG          | 600
      20    | Boots  | Trail Riders Gaiters      | HD LS          | 600
      20    | Ring   | Episcopal Ring            | MP SK          | 600
      20    | Ring   | Mourning Ring             | DG IW          | 600
      20    | Ring   | Steel Band                | BI LS          | 600
      20    | Weapon | Flail                     | HD KW          | 600
      20    | Weapon | Net                       | LS SK          | 600
      20    | Weapon | Rapier                    | BI WF          | 600

      # ---- Level 25 ----
      25    | Helmet | Lead Circlet              | BI IW DG       | 1600
      25    | Helmet | Pirate Tricorne           | HD LS SK       | 1600
      25    | Helmet | Travelers Hood            | HD MP GH       | 1600
      25    | Chest  | Iron Chainmail            | LS BI HD       | 1600
      25    | Chest  | Maesters Robes            | MP SK          | 2400
      25    | Chest  | Riveted Brigandine        | WW CB DG       | 1600
      25    | Pants  | Bronze Chausses           | CB WW IW       | 1600
      25    | Pants  | Golden Fauld              | CB SK KW       | 1600
      25    | Pants  | Tyroshi Leggings          | MP WF DG       | 1600
      25    | Boots  | Dancing Shoes             | MP KW GH       | 1600
      25    | Boots  | Electrum Sabatons         | BI CB LS       | 1600
      25    | Boots  | Knife Toed Boots          | LS CB          | 2400
      25    | Ring   | Electrum Band             | CB WW IW       | 1600
      25    | Ring   | Opal                      | DG KW SK       | 1600
      25    | Ring   | Painite                   | DG LS GH       | 1600
      25    | Weapon | Gladius                   | WW BI DG       | 1600
      25    | Weapon | Hand Axe                  | LS BI HD       | 1600
      25    | Weapon | Light Crossbow            | WW SK IW       | 1600

      # ---- Level 30 ----
      30    | Helmet | Garnet Forehead Pendant   | DG LS WF       | 4000
      30    | Helmet | Kettle Helm               | CB GH          | 6000
      30    | Helmet | Officers Plumed Helm      | SK DG HD       | 4000
      30    | Chest  | Gold Chainmail            | LS CB          | 6000
      30    | Chest  | Iron Brigandine           | WW LS HD       | 4000
      30    | Chest  | Silk Tunic                | SK MP          | 6000
      30    | Pants  | Gold-Thread Trousers      | CB KW MP       | 4000
      30    | Pants  | Iron Poleyns              | BI IW HD       | 4000
      30    | Pants  | Steel Culet               | BI KW GH       | 4000
      30    | Boots  | Pathfinders Boots         | IW KW MP       | 4000
      30    | Boots  | Silver Sabatons           | CB LS MP       | 4000
      30    | Boots  | Spiked Boots              | LS CB WF DG    | 3000
      30    | Ring   | Electrum Bronze Braid     | CB BI MP       | 4000
      30    | Ring   | Lead Band                 | BI MP SK       | 4000
      30    | Ring   | Obsidian Ring             | BI WF SK       | 4000
      30    | Weapon | Bastard Sword             | WW LS HD       | 4000
      30    | Weapon | Glaive                    | LS CB HD       | 4000
      30    | Weapon | Recurve Bow               | GH HD DG       | 4000

      # ---- Level 35 ----
      35    | Helmet | Casque                    | CB KW HD       | 16000
      35    | Helmet | Emerald Forehead Pendant  | DG HD SK       | 16000
      35    | Helmet | Silk Chapeau              | SK LS MP       | 16000
      35    | Chest  | Satin Dress               | SK MP          | 24000
      35    | Chest  | Silvered Brigandine       | IW DG          | 24000
      35    | Chest  | Steel Chainmail           | LS CB BI       | 16000
      35    | Pants  | Balzarine Skirt           | SK MP WF       | 16000
      35    | Pants  | Electrum Tasset           | CB HD WW       | 16000
      35    | Pants  | Fur-Lined Britches        | HD IW KW       | 16000
      35    | Boots  | Earthshakers              | BI WW IW       | 16000
      35    | Boots  | Gold Sabatons             | SK CB MP       | 16000
      35    | Boots  | Winged Boots              | LS WF DG       | 16000
      35    | Ring   | Ecclesiastical Ring       | DG IW WW       | 16000
      35    | Ring   | Pale Steel Band           | DG WW GH       | 16000
      35    | Ring   | Poison Ring               | DG LS BI       | 16000
      35    | Weapon | Falchion                  | IW BI CB       | 16000
      35    | Weapon | Lance                     | LS CB BI       | 16000
      35    | Weapon | Longbow                   | GH SK HD DG    | 12000

      # ---- Level 40 ----
      40    | Helmet | Copper Circlet            | CB GH WW       | 60000
      40    | Helmet | Golden Crown              | CB LS HD KW    | 45000
      40    | Helmet | Mark of the Seven         | WF KW WW GH    | 45000
      40    | Chest  | Courtesans Outfit         | SK LS MP       | 60000
      40    | Chest  | Electrum Scale Mail       | WW KW CB BI    | 45000
      40    | Chest  | Iron Scale Mail           | GH KW BI LS    | 45000
      40    | Pants  | Bronze Cuisse             | CB WW GH HD    | 45000
      40    | Pants  | Iron Greaves              | BI IW WF CB    | 45000
      40    | Pants  | Velour Pants              | HD WF MP KW    | 45000
      40    | Boots  | Black Iron Sabatons       | SK BI WF HD    | 45000
      40    | Boots  | Blackwater Treads         | WW BI HD KW    | 45000
      40    | Boots  | Copper Spiked Kickers     | CB LS WF MP    | 45000
      40    | Ring   | Iron Ring                 | BI LS IW GH    | 45000
      40    | Ring   | Ruby                      | DG KW SK MP    | 45000
      40    | Ring   | Sapphire                  | DG WW HD MP    | 45000
      40    | Weapon | Heavy Crossbow            | WW LS HD DG    | 45000
      40    | Weapon | Longsword                 | WW KW CB BI    | 45000
      40    | Weapon | Poleaxe                   | GH KW BI LS    | 45000

      # ---- Level 45 ----
      45    | Helmet | Assassins Cowl            | SK LS HD KW    | 120000
      45    | Helmet | Jewel Encrusted Tiara     | DG WF KW SK    | 120000
      45    | Helmet | Sapphire Forehead Pendant | DG IW KW HD    | 120000
      45    | Chest  | Bronze Cuirass            | IW KW HD DG    | 120000
      45    | Chest  | Golden Raiment            | GH CB WW IW    | 120000
      45    | Chest  | Lead Cuirass              | BI WW SK GH    | 120000
      45    | Pants  | Satin Skirt               | SK MP KW CB    | 120000
      45    | Pants  | Steel Greaves             | BI IW WW GH    | 120000
      45    | Pants  | Wolf Pelt Trousers        | HD KW SK MP    | 120000
      45    | Boots  | Copper Sabatons           | CB IW KW MP    | 120000
      45    | Boots  | Lead Soled Shoes          | KW BI WW CB    | 120000
      45    | Boots  | Spurred Treads            | IW DG GH HD    | 120000
      45    | Ring   | Emerald                   | DG WW MP GH    | 120000
      45    | Ring   | Gold Loop                 | CB WW SK MP    | 120000
      45    | Ring   | Pearl                     | DG HD IW GH    | 120000
      45    | Weapon | Battle Axe                | WW CB SK GH    | 120000
      45    | Weapon | Morning Star              | IW KW HD WF    | 120000
      45    | Weapon | Triple Crossbow           | GH KW WW IW    | 120000

      # ---- Level 50 ----
      50    | Helmet | Ceremonial Head Dress     | DG LS WF MP    | 450000
      50    | Helmet | Greathelm                 | HD CB KW GH    | 450000
      50    | Helmet | Steel Circlet             | BI MP WF HD    | 450000
      50    | Chest  | Bastion of Pale Steel     | GH LS CB MP    | 450000
      50    | Chest  | Black Iron Plate          | BI IW DG KW    | 450000
      50    | Chest  | Suit of Iron              | SK HD BI WF    | 450000
      50    | Pants  | Copper Greaves            | CB LS DG SK    | 450000
      50    | Pants  | Silk Hose                 | SK WW MP LS    | 450000
      50    | Pants  | Silver Leg Plates         | WW MP IW KW    | 450000
      50    | Boots  | Boots of the Berserker    | SK WF DG LS    | 450000
      50    | Boots  | Iron Sabatons             | GH BI IW HD    | 450000
      50    | Boots  | Silk Slippers             | SK GH MP CB    | 450000
      50    | Ring   | Black Iron Band           | BI KW IW WW    | 450000
      50    | Ring   | Diamond                   | DG LS WW GH    | 450000
      50    | Ring   | Valyrian Steel Band       | BI CB WF DG    | 450000
      50    | Weapon | Greatbow                  | GH LS SK WF    | 450000
      50    | Weapon | Greatsword                | WW HD CB WF    | 450000
      50    | Weapon | War Hammer                | KW IW BI WF    | 450000
    `),





    ...EVENT_SETS

  ];

  const PIECE_INFO = {};
  Object.assign(PIECE_INFO, EVENT_PIECE_INFO);

  const RARITY_BY_LEVEL = { "1": 5, "5": 5, "10": 5, "15": 3 };

  const FLUX_COST_PER_LEVEL = { "1": 18, "5": 30, "10": 60, "15": 120 };

  function levelsOf(keep) {
    const seen = {};
    SETS.filter(keep).forEach((set) => {
      Object.keys(set.pieces).forEach((lvl) => {
        if (Object.keys(set.pieces[lvl]).length) seen[lvl] = true;
      });
    });
    return Object.keys(seen).sort((a, b) => Number(a) - Number(b));
  }


  const CUSTOM_MIN_LEVEL = 15;


  const VALID_LEVELS = levelsOf((set) => set.core)
    .filter((lvl) => lvl in RARITY_BY_LEVEL);

  const CUSTOM_LEVELS = levelsOf(() => true)
    .filter((lvl) => Number(lvl) >= CUSTOM_MIN_LEVEL);

  const RARITY_LABELS = ["Poor", "Common", "Fine", "Exquisite", "Epic", "Legendary"];


  const RARITY_COLORS = [
    "#8d99a6",  // Poor       — grey
    "#4ec06a",  // Common     — green
    "#4a9df0",  // Fine       — blue
    "#a874e8",  // Exquisite  — purple
    "#f0913a",  // Epic       — orange
    "#f2ce3f"   // Legendary  — yellow
  ];

  const SUFFIX_MAP = { K: 1e3, M: 1e6, B: 1e9 };

  /* ------------------------------------------------------------------ *
   *  Derived lookups                                                    *
   * ------------------------------------------------------------------ */

  const SET_BY_ID = {};
  SETS.forEach((set) => { SET_BY_ID[set.id] = set; });

  const SET_OF_PIECE = {};
  SETS.forEach((set) => {
    Object.keys(set.pieces).forEach((lvl) => {
      Object.keys(set.pieces[lvl]).forEach((name) => {
        if (!(name in SET_OF_PIECE)) SET_OF_PIECE[name] = set;
      });
    });
  });


  const CRAFT_COSTS = (function () {
    const out = {};
    SETS.filter((set) => set.core).forEach((set) => {
      Object.keys(set.pieces).forEach((lvl) => {
        if (!out[lvl]) out[lvl] = {};
        Object.keys(set.pieces[lvl]).forEach((name) => {
          const recipe = set.pieces[lvl][name];
          out[lvl][name] = [recipe[0], recipe[1]];
        });
      });
    });
    return out;
  })();

  function pieceCountAtLevel(set, level) {
    return set.pieces[level] ? Object.keys(set.pieces[level]).length : 0;
  }

  function seasons() {
    const seen = [];
    SETS.forEach((set) => {
      const season = set.season || "";
      if (season && seen.indexOf(season) === -1) seen.push(season);
    });
    return seen;
  }

  const DEFAULTS = {
    mats:        MATERIALS.map(() => 5700000),
    levels:      ["1", "5", "10"],
    scale:       0,
    showMats:    false,
    autoApply:   false,
    sortMode:    "count",

    customLevel: "15",
    customRarity: 5,
    customSets:  SETS.filter((s) => s.core).map((s) => s.id),
    theme:       "dark",

    tab:         "standard"
  };

  /* ---------------- display helpers ---------------- */

  const materialName = (code) => (MATERIAL_INFO[code] && MATERIAL_INFO[code].name) || code;
  const materialIcon = (code) => (MATERIAL_INFO[code] && MATERIAL_INFO[code].icon) || "";

  const pieceInfo = (key) => PIECE_INFO[key] || {};
  const pieceName = (key) => pieceInfo(key).name || key;
  const pieceSlot = (key) => pieceInfo(key).slot || "";
  const pieceSet  = (key) => pieceInfo(key).set
    || (SET_OF_PIECE[key] ? SET_OF_PIECE[key].name : "");

  const iconIsImage = (icon) => /[\/.]/.test(icon);

  const setIcon   = (set) => (set && set.icon)   || "";
  const setBanner = (set) => (set && set.banner) || "";

  PF.data = {
    MATERIALS, CRAFT_COSTS, RARITY_BY_LEVEL, FLUX_COST_PER_LEVEL,
    VALID_LEVELS, CUSTOM_LEVELS, RARITY_LABELS, RARITY_COLORS,
    SUFFIX_MAP, DEFAULTS, setIcon, setBanner,
    MATERIAL_INFO, PIECE_INFO, SLOTS, SUPPORT,
    SETS, SET_BY_ID, SET_OF_PIECE, pieceCountAtLevel, seasons,
    materialName, materialIcon, iconIsImage,
    pieceInfo, pieceName, pieceSet, pieceSlot
  };
})(globalThis.PF);
