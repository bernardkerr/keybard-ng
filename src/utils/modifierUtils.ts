
import { CODEMAP } from "@/constants/keygen";

export const modifierOptions = ["Shift", "Ctrl", "Alt", "Gui"] as const;
export type Modifier = typeof modifierOptions[number];

// Helper to apply modifiers to a keycode
export const MODIFIER_MAP: Record<number, string> = {
    1: "LCTL",
    2: "LSFT",
    3: "C_S",
    4: "LALT",
    5: "LCA",
    6: "LSA",
    7: "MEH",
    8: "LGUI",
    9: "LCG",
    10: "SGUI",
    11: "LSCG",
    12: "LAG",
    13: "LCAG",
    14: "LSAG",
    15: "HYPR",
};

// Mod-Tap variants (hold for modifier, tap for keycode)
export const MOD_TAP_MAP: Record<number, string> = {
    1: "LCTL_T",
    2: "LSFT_T",
    3: "C_S_T",
    4: "LALT_T",
    5: "LCA_T",
    6: "LSA_T",
    7: "MEH_T",
    8: "LGUI_T",
    9: "LCG_T",
    10: "SGUI_T",
    11: "LSCG_T",
    12: "LAG_T",
    13: "LCAG_T",
    14: "LSAG_T",
    15: "HYPR_T",
};

// One-Shot Modifier keycodes (standalone, don't wrap a keycode)
export const ONE_SHOT_MAP: Record<number, string> = {
    1: "OSM(MOD_LCTL)",
    2: "OSM(MOD_LSFT)",
    3: "OSM(MOD_LCTL|MOD_LSFT)",
    4: "OSM(MOD_LALT)",
    5: "OSM(MOD_LCTL|MOD_LALT)",
    6: "OSM(MOD_LSFT|MOD_LALT)",
    7: "OSM(MOD_MEH)",
    8: "OSM(MOD_LGUI)",
    9: "OSM(MOD_LCTL|MOD_LGUI)",
    10: "OSM(MOD_LSFT|MOD_LGUI)",
    11: "OSM(MOD_LCTL|MOD_LSFT|MOD_LGUI)",
    12: "OSM(MOD_LALT|MOD_LGUI)",
    13: "OSM(MOD_LCTL|MOD_LALT|MOD_LGUI)",
    14: "OSM(MOD_LSFT|MOD_LALT|MOD_LGUI)",
    15: "OSM(MOD_HYPR)",
};

// Reverse map: modifier mask → which Modifier[] toggles are on
export const MASK_TO_MODIFIERS: Record<number, Modifier[]> = {
    1: ["Ctrl"], 2: ["Shift"], 3: ["Ctrl", "Shift"],
    4: ["Alt"], 5: ["Ctrl", "Alt"], 6: ["Shift", "Alt"], 7: ["Ctrl", "Shift", "Alt"],
    8: ["Gui"], 9: ["Ctrl", "Gui"], 10: ["Shift", "Gui"], 11: ["Ctrl", "Shift", "Gui"],
    12: ["Alt", "Gui"], 13: ["Ctrl", "Alt", "Gui"], 14: ["Shift", "Alt", "Gui"], 15: ["Ctrl", "Shift", "Alt", "Gui"],
};

// Decompose a numeric keycode into { modifiers, baseKeycode, isModTap }
// QK_MODS range: 0x0100-0x1FFF  (modifier + key)
// QK_MOD_TAP range: 0x2000-0x3FFF (mod-tap)
export const decomposeKeycode = (numericKeycode: number): { modifiers: Modifier[], baseKeycode: string, isModTap: boolean } | null => {
    if (numericKeycode >= 0x2000 && numericKeycode <= 0x3FFF) {
        // Mod-tap: bits [12:8] = mod mask (left mods in bits 0-3 of that nibble)
        const modBits = (numericKeycode >> 8) & 0x1F;
        const mask = modBits & 0x0F;
        const baseCode = numericKeycode & 0xFF;
        const baseStr = baseCode in CODEMAP ? (CODEMAP[baseCode] as string) : null;
        const mods = MASK_TO_MODIFIERS[mask];
        if (baseStr && mods) {
            return { modifiers: mods, baseKeycode: baseStr, isModTap: true };
        }
    } else if (numericKeycode >= 0x0100 && numericKeycode <= 0x1FFF) {
        // QK_MODS: bits [12:8] = mod mask
        const modBits = (numericKeycode >> 8) & 0x1F;
        const mask = modBits & 0x0F;
        const baseCode = numericKeycode & 0xFF;
        const baseStr = baseCode in CODEMAP ? (CODEMAP[baseCode] as string) : null;
        const mods = MASK_TO_MODIFIERS[mask];
        if (baseStr && mods) {
            return { modifiers: mods, baseKeycode: baseStr, isModTap: false };
        }
    }
    return null;
};

// Helper to get modifier bitmask
export const getModifierMask = (activeModifiers: Modifier[]): number => {
    const hasCtrl = activeModifiers.includes("Ctrl");
    const hasShift = activeModifiers.includes("Shift");
    const hasAlt = activeModifiers.includes("Alt");
    const hasGui = activeModifiers.includes("Gui");
    return (hasCtrl ? 1 : 0) | (hasShift ? 2 : 0) | (hasAlt ? 4 : 0) | (hasGui ? 8 : 0);
};

// Get the OSM keycode string for the currently active modifiers (or null if none)
export const getOsmKeycode = (activeModifiers: Modifier[]): string | null => {
    if (activeModifiers.length === 0) return null;
    const mask = getModifierMask(activeModifiers);
    return ONE_SHOT_MAP[mask] || null;
};

// Helper to apply modifiers to a keycode
export const applyModifiers = (keycode: string, activeModifiers: Modifier[], isModTap: boolean) => {
    if (activeModifiers.length === 0) return keycode;

    const mask = getModifierMask(activeModifiers);
    const modMap = isModTap ? MOD_TAP_MAP : MODIFIER_MAP;
    const modifierFunc = modMap[mask];
    return modifierFunc ? `${modifierFunc}(${keycode})` : keycode;
};
