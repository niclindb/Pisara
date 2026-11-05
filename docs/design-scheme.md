# Pisara design scheme

_Version 1, November 4, 2026. Chosen with Nick in the design thread. Screen mockups: [Pisara screens](https://claude.ai/artifact/DjmwtVNNWmDHdWKbaGTuoV)._

## 1. Base colors

| Name | Hex | Role |
|---|---|---|
| Fjord navy | `#0B2545` | The main color: primary buttons and the home page hero. Text is a darker shade of it |
| Mist | `#D0D7DC` | The neutral. Page and card backgrounds are lighter tints of it |
| Cherry plum | `#6B1040` | The red in light mode |
| Lit black cherry | `#7A0F3A` | The red in dark mode; topic labels lift to `#D7527F` so small text stays readable, and fills deepen to a soft tint `#3F1B37` |
| Electric cyan | `#00C2FF` | The bright accent. Used for fills and highlights, never as small text on light backgrounds |

No yellows.

## 2. Color tokens

Use these names in code (Tailwind theme and CSS variables). The same values are checked by `lib/a11y/color-pairs.ts` on every pull request. All text pairs meet WCAG 2.2 AA (4.5:1), and borders, focus rings and controls meet 3:1, in both modes.

| Token | Light | Dark | Use |
|---|---|---|---|
| `page` | `#E5E9EC` | `#040F1C` | Page background |
| `surface` | `#F9FAFB` | `#061528` | Cards, panels, the top bar |
| `text` | `#07182D` | `#F3F5F6` | Body text and headings |
| `textMuted` | `#5C6774` | `#D0D7DC` | Dates, reading time, hints |
| `border` | `#6E7A86` | `#6B7C8F` | Input and quiz option borders |
| `hairline` | `#B8C0C7` | `#293646` | Decorative dividers only (not for controls) |
| `primary` | `#0B2545` | `#00C2FF` | Primary buttons and links |
| `primaryText` | `#FFFFFF` | `#040F1C` | Text on primary buttons |
| `accent` | `#6B1040` | `#D7527F` | Topic labels, step numbers (black cherry) |
| `accentFill` | `#6B1040` | `#3F1B37` | Milestone card and other cherry fills |
| `accentFillText` | `#FFFFFF` | `#F3F5F6` | Text on cherry fills |
| `bright` | `#00C2FF` | `#00C2FF` | Highlighted words, "lessons waiting" badge, progress, home page buttons |
| `brightText` | `#07182D` | `#040F1C` | Text on bright fills |
| `focusRing` | `#0B2545` | `#00C2FF` | Keyboard focus ring |
| `success` | `#0B6B4F` | `#7FE0B5` | Right answers, with a check mark and "Correct" |
| `successBg` | `#E1F2EA` | `#083336` | Right answer box |
| `danger` | `#B3123F` | `#FF8FAB` | Form errors and delete buttons. A cool crimson, kept apart from the cherry accent. Not used for missed quiz answers |
| `dangerBg` | `#FBE6EC` | `#3A1225` | Error summary box |
| `heroBg` | `#0B2545` | `#061528` | Home page hero band |
| `heroText` | `#FFFFFF` | `#F3F5F6` | Hero headline and navigation |
| `heroMuted` | `#D0D7DC` | `#D0D7DC` | Hero intro text |

Dark mode follows the device setting, with a manual switch later.

### Dark mode is quieter

There are only two modes, Light and Dark. Cyan glows on dark backgrounds, so dark mode uses it in fewer places than light mode:

- Cyan stays on primary buttons, highlighted words and the "lessons waiting" badge.
- Progress bars and the avatar use Mist (`textMuted`) instead of the primary color.
- The top band on the Today card is a thin 2px cherry (`accent`) line, not a 6px cyan bar.
- The milestone card is a soft cherry tint (`accentFill`) with normal text color.
- Secondary buttons in the navigation are outlined, not filled.

## 3. Type

| Role | Font | Weight | Notes |
|---|---|---|---|
| Headings, lesson titles, wordmark | Libre Baskerville | 700 (400 italic for emphasis) | `text-wrap: balance` on headings |
| Body, lesson text, buttons, labels | Karla | 400, 500, 700 | Lesson text 18px, line height 1.75, about 65 characters wide |

Fallbacks: `Georgia, serif` for headings, `system-ui, sans-serif` for body. Load both from Google Fonts (or self-host with `next/font`).

Scale (px): 13 labels · 15 meta · 16 UI · 18 lesson text · 22 section heading · 32 page title · 42 lesson title · 52 home headline. Small uppercase labels use 0.08em letter spacing.

## 4. Shape and spacing

- Corner radius: 8px for buttons and inputs, 12px for small cards, 16px for main cards.
- Spacing steps (px): 4, 8, 12, 16, 20, 24, 32, 48, 64.
- Cards: `surface` fill with a `hairline` border, no heavy shadows inside the app. The home page lesson-card stack is the one place with a soft shadow.
- Today's lesson card has a 6px `bright` band on top.

## 5. Logo

The mark is a smooth river stone with a drop worn through it, from the saying "drop by drop wears away the stone": small lessons, every day, change something solid. The hole has a sloping rim, and a short crescent of light runs along the stone's upper left edge. The name beside it is **pisara** in Libre Baskerville Bold, traced to outlines so it never depends on the font loading.

Files live in `public/brand/`:

| File | Use |
|---|---|
| `pisara-logo-horizontal-light.svg` / `-dark.svg` | Main logo, the icon beside the name. Use `-light` on light backgrounds and `-dark` on dark ones. PNG copies are for email |
| `pisara-logo-stacked-light.svg` / `-dark.svg` | The icon above the name, for square spaces |
| `pisara-logo-*-navy.svg` / `-white.svg` | One-color versions for single-ink print. The light and shade become thin gaps |
| `pisara-icon-light.svg` / `-dark.svg`, `-navy`, `-white` | The icon alone |
| `pisara-app-icon.svg`, `-1024.png`, `-512.png` | Square app icon on navy. The OS rounds the corners |

Next.js picks up the browser icons from `app/` automatically: `app/icon.svg` (switches to the dark version when the browser is in dark mode), `app/favicon.ico` (16, 32 and 48 px), and `app/apple-icon.png` (180 px home-screen icon).

Logo colors:

| Part | Light mode | Dark mode | App icon |
|---|---|---|---|
| Stone | `#0B2545` | `#DCE2E7` | `#E5E9EC` on `#0B2545` |
| Light and worn rim | `#3B5A80` | `#9AA8B6` | `#A9B7C5` |

Logos are exempt from WCAG contrast rules, but the stone still stands out clearly: it is at least 12.6:1 against every page and surface color, and the shade is at least 6.8:1. These colors are only for the logo, so they are not in `lib/a11y/color-pairs.ts`.

Rules:
- Leave clear space around the logo at least as wide as the drop.
- Don't use the icon smaller than 16 px, or the horizontal logo shorter than 20 px.
- Don't recolor, stretch, rotate or add effects to the logo. Don't put the light-mode logo on navy or the dark-mode logo on a light background.
- Don't use cyan in the logo. Cyan stays the spark color in the app.

## 6. Rules of thumb

- Cyan is a spark: highlights, badges, progress and a few buttons. Don't use it for paragraphs or small text on light backgrounds.
- Black cherry marks topics and celebrations. A missed quiz answer is neutral: a plain box with a text-colored border, a cross and "Not quite", next to the right answer in green. Missing a question is part of learning, so it never shows as an error. `danger` (crimson) is only for form errors and destructive buttons.
- Milestone wording never mentions days in a row or missed days (see design.md section 5.5).
- Any new color goes into `lib/a11y/color-pairs.ts` first, with every pair it's used in.
