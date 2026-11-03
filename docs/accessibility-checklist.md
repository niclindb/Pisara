# Accessibility checklist

Pisara targets **WCAG 2.2 AA** (see [design.md](design.md) section 10). The automated checks catch maybe half of real problems. This list covers the rest.

**On a PR that changes UI:** run the sections that apply to the pages you touched.
**Before each release:** run all of it on sign-in, onboarding, inbox, a lesson with its quiz, progress, settings, and the lesson editor.

Takes about 10 minutes per page once you're used to it.

## 1. Keyboard only (unplug the mouse)
- [ ] Tab reaches every link, button and input, in an order that matches the screen.
- [ ] The focus ring is always visible and never hidden under a sticky header.
- [ ] "Skip to content" appears on the first Tab and works.
- [ ] Quiz: pick an answer, submit, and read the result without the mouse.
- [ ] Menus and dialogs open with Enter or Space, close with Escape, and return focus to what opened them.
- [ ] Lesson editor: lessons can be reordered with the Move up / Move down buttons.
- [ ] Nothing traps focus.

## 2. Screen reader (VoiceOver: Cmd+F5 on Mac; also check iPhone before release)
- [ ] The page title is read on arrival and says which page this is.
- [ ] Headings list (VO+U, then arrows) shows one `h1` and a sensible outline.
- [ ] Every button and input says what it does ("Submit answer", not "Button").
- [ ] Quiz answers are read as a group with the question, and the chosen one is announced.
- [ ] Right / wrong results, "check your inbox", and "saved" messages are announced without moving there.
- [ ] Images in lessons have alt text that says what matters; decorative ones are skipped.
- [ ] Form errors are read out and say how to fix them.

## 3. Zoom, size and motion
- [ ] At 200% browser zoom nothing is cut off or overlapping.
- [ ] At 320 px wide (or 400% zoom) there's no sideways scrolling, except inside code blocks.
- [ ] With a larger default font size in browser settings, text grows and layouts hold.
- [ ] With "Reduce motion" on (macOS Accessibility settings), milestone celebrations don't animate.
- [ ] Tap targets on a phone are easy to hit; quiz answers and main buttons feel at least finger-sized.

## 4. Color and wording
- [ ] Nothing relies on color alone (right/wrong, errors, required fields, charts).
- [ ] New colors were added to `lib/a11y/color-pairs.ts` and the contrast test passes.
- [ ] Links make sense out of context ("Read today's lesson", not "Click here").
- [ ] Error and empty-state messages are plain and say what to do next.

## 5. Emails (before release, or when an email template changes)
- [ ] Readable with images turned off.
- [ ] Headings, link text and contrast follow the same rules as the site.
- [ ] Plain-text version reads well.
- [ ] VoiceOver in Apple Mail reads it in a sensible order.
