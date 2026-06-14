// Runtime accent theming + density. The brand palette is exposed as CSS
// variables (--brand-50..950); swapping them re-themes the whole UI.

export type AccentName = "teal" | "violet" | "blue" | "rose" | "amber";

const STEPS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

// Each palette is 11 RGB triplets (50 → 950).
export const PALETTES: Record<AccentName, string[]> = {
  teal: [
    "236 253 246", "209 250 233", "167 243 214", "110 231 189", "52 211 161",
    "19 184 134", "8 150 109", "7 120 89", "10 95 72", "10 78 60", "2 44 34",
  ],
  violet: [
    "245 243 255", "237 233 254", "221 214 254", "196 181 253", "167 139 250",
    "139 92 246", "124 58 237", "109 40 217", "91 33 182", "76 29 149", "46 16 101",
  ],
  blue: [
    "239 246 255", "219 234 254", "191 219 254", "147 197 253", "96 165 250",
    "59 130 246", "37 99 235", "29 78 216", "30 64 175", "30 58 138", "23 37 84",
  ],
  rose: [
    "255 241 242", "255 228 230", "254 205 211", "253 164 175", "251 113 133",
    "244 63 94", "225 29 72", "190 18 60", "159 18 57", "136 19 55", "76 5 25",
  ],
  amber: [
    "255 251 235", "254 243 199", "253 230 138", "252 211 77", "251 191 36",
    "245 158 11", "217 119 6", "180 83 9", "146 64 14", "120 53 15", "69 26 3",
  ],
};

export const ACCENTS: { name: AccentName; label: string; swatch: string }[] = [
  { name: "teal", label: "Teal", swatch: "#13b886" },
  { name: "violet", label: "Violet", swatch: "#8b5cf6" },
  { name: "blue", label: "Blue", swatch: "#3b82f6" },
  { name: "rose", label: "Rose", swatch: "#f43f5e" },
  { name: "amber", label: "Amber", swatch: "#f59e0b" },
];

export function getSavedAccent(): AccentName {
  if (typeof window === "undefined") return "teal";
  const a = localStorage.getItem("rp_accent") as AccentName | null;
  return a && PALETTES[a] ? a : "teal";
}

export function applyAccent(name: AccentName) {
  const palette = PALETTES[name] || PALETTES.teal;
  const root = document.documentElement;
  palette.forEach((rgb, i) => root.style.setProperty(`--brand-${STEPS[i]}`, rgb));
  localStorage.setItem("rp_accent", name);
  localStorage.setItem("rp_accent_palette", JSON.stringify(palette));
}

/* ---------------- Density (UI scale via root font-size) ---------------- */
export type Density = "comfortable" | "compact";

export function getSavedDensity(): Density {
  if (typeof window === "undefined") return "comfortable";
  return localStorage.getItem("rp_density") === "compact" ? "compact" : "comfortable";
}

export function applyDensity(d: Density) {
  document.documentElement.style.fontSize = d === "compact" ? "14.5px" : "";
  localStorage.setItem("rp_density", d);
}
