// Every foreground/background combination the UI uses, checked against WCAG 2.2 AA
// by color-pairs.test.ts on every pull request.
//
// PLACEHOLDER: these are neutral stand-in colors until the visual design scheme is
// picked. When the scheme lands, replace `colors` with its tokens (the same values
// as the Tailwind theme) and list every pair the designs actually use, in light and
// dark mode. If a pair fails, change the color, not the test.

export const colors = {
  light: {
    page: "#ffffff",
    surface: "#f5f5f4",
    text: "#1c1917",
    textMuted: "#57534e",
    border: "#78716c",
    accent: "#1d4ed8",
    accentText: "#ffffff",
    focusRing: "#1d4ed8",
    danger: "#b91c1c",
    success: "#15803d",
  },
  dark: {
    page: "#1c1917",
    surface: "#292524",
    text: "#fafaf9",
    textMuted: "#a8a29e",
    border: "#78716c",
    accent: "#93c5fd",
    accentText: "#1c1917",
    focusRing: "#93c5fd",
    danger: "#fca5a5",
    success: "#86efac",
  },
} as const;

type Mode = keyof typeof colors;
type Token = keyof (typeof colors)["light"];

export interface ColorPair {
  fg: Token;
  bg: Token;
  /** text = normal text, largeText = 24px+ or 18.66px+ bold, ui = borders, icons, focus rings */
  use: "text" | "largeText" | "ui";
  /** Where it shows up, so a failure is easy to find. */
  where: string;
}

export const pairs: ColorPair[] = [
  { fg: "text", bg: "page", use: "text", where: "Body text" },
  { fg: "text", bg: "surface", use: "text", where: "Text on cards" },
  { fg: "textMuted", bg: "page", use: "text", where: "Reading time, hints" },
  { fg: "textMuted", bg: "surface", use: "text", where: "Hints on cards" },
  { fg: "accent", bg: "page", use: "text", where: "Links" },
  { fg: "accentText", bg: "accent", use: "text", where: "Primary button label" },
  { fg: "danger", bg: "page", use: "text", where: "Wrong answer, form errors" },
  { fg: "success", bg: "page", use: "text", where: "Right answer" },
  { fg: "border", bg: "page", use: "ui", where: "Input and quiz option borders" },
  { fg: "border", bg: "surface", use: "ui", where: "Input borders on cards" },
  { fg: "focusRing", bg: "page", use: "ui", where: "Keyboard focus ring" },
  { fg: "focusRing", bg: "surface", use: "ui", where: "Focus ring on cards" },
  { fg: "accent", bg: "page", use: "ui", where: "Primary button against the page" },
];

export const modes = Object.keys(colors) as Mode[];
