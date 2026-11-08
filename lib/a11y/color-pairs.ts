// Every foreground/background combination the UI uses, checked against WCAG 2.2 AA
// by color-pairs.test.ts on every pull request.
//
// The values are the Pisara design scheme in docs/design-scheme.md. Keep the two in
// sync, and use the same values in the Tailwind theme. If a pair fails, change the
// color, not the test. `hairline` is for decorative dividers only, so it has no pair.

export const colors = {
  light: {
    page: "#E5E9EC",
    surface: "#F9FAFB",
    text: "#07182D",
    textMuted: "#5C6774",
    border: "#6E7A86",
    hairline: "#B8C0C7",
    primary: "#0B2545",
    primaryText: "#FFFFFF",
    accent: "#6B1040",
    accentFill: "#6B1040",
    accentFillText: "#FFFFFF",
    bright: "#00C2FF",
    brightText: "#07182D",
    focusRing: "#0B2545",
    success: "#0B6B4F",
    successBg: "#E1F2EA",
    danger: "#B3123F",
    dangerBg: "#FBE6EC",
    heroBg: "#0B2545",
    heroText: "#FFFFFF",
    heroMuted: "#D0D7DC",
  },
  dark: {
    page: "#040F1C",
    surface: "#061528",
    text: "#F3F5F6",
    textMuted: "#D0D7DC",
    border: "#6B7C8F",
    hairline: "#293646",
    primary: "#00C2FF",
    primaryText: "#040F1C",
    accent: "#D7527F",
    accentFill: "#3F1B37",
    accentFillText: "#F3F5F6",
    bright: "#00C2FF",
    brightText: "#040F1C",
    focusRing: "#00C2FF",
    success: "#7FE0B5",
    successBg: "#083336",
    danger: "#FF8FAB",
    dangerBg: "#3A1225",
    heroBg: "#061528",
    heroText: "#F3F5F6",
    heroMuted: "#D0D7DC",
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
  { fg: "textMuted", bg: "page", use: "text", where: "Dates, reading time, hints" },
  { fg: "textMuted", bg: "surface", use: "text", where: "Meta text on cards" },
  { fg: "primary", bg: "page", use: "text", where: "Links" },
  { fg: "primary", bg: "surface", use: "text", where: "Links on cards" },
  { fg: "primaryText", bg: "primary", use: "text", where: "Primary button label" },
  { fg: "accent", bg: "page", use: "text", where: "Topic labels, step numbers, hovered links" },
  { fg: "accent", bg: "surface", use: "text", where: "Topic labels on cards, hovered links on cards" },
  { fg: "accentFillText", bg: "accentFill", use: "text", where: "Milestone card text" },
  { fg: "brightText", bg: "bright", use: "text", where: "Highlighted words, \"lessons waiting\" badge, bright buttons" },
  { fg: "success", bg: "surface", use: "text", where: "Right answer" },
  { fg: "success", bg: "successBg", use: "text", where: "Right answer in its tinted box" },
  { fg: "danger", bg: "surface", use: "text", where: "Missed quiz answers, form errors, delete buttons" },
  { fg: "danger", bg: "dangerBg", use: "text", where: "Missed quiz answer and error summary boxes" },
  { fg: "heroText", bg: "heroBg", use: "largeText", where: "Home page headline" },
  { fg: "heroText", bg: "heroBg", use: "text", where: "Home page navigation" },
  { fg: "heroMuted", bg: "heroBg", use: "text", where: "Home page intro text" },
  { fg: "bright", bg: "heroBg", use: "text", where: "Hovered link in the home page header" },
  { fg: "border", bg: "page", use: "ui", where: "Input and quiz option borders" },
  { fg: "border", bg: "surface", use: "ui", where: "Input borders on cards" },
  { fg: "focusRing", bg: "page", use: "ui", where: "Keyboard focus ring" },
  { fg: "focusRing", bg: "surface", use: "ui", where: "Focus ring on cards" },
  { fg: "primary", bg: "page", use: "ui", where: "Primary button against the page" },
  { fg: "success", bg: "successBg", use: "ui", where: "Right answer box border" },
  { fg: "danger", bg: "dangerBg", use: "ui", where: "Missed quiz answer and error summary box borders" },
];

export const modes = Object.keys(colors) as Mode[];
