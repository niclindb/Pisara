# Pisara

Pisara (Finnish for "a drop") sends you one short lesson a day from topics you choose, with a quick quiz and spaced review of what you missed.

- [User stories and MVP](docs/user-stories-and-mvp.md)
- [Design doc](docs/design.md)
- [Lesson Roulette prototype](lesson-roulette.html): an early click-through prototype of daily topic picking. Open it in a browser. It predates some design decisions (it uses the old Off/Sometimes/Often/Lots interest levels and makes you retake a lesson you fail).

## Code so far

- `supabase/`: the database schema, access rules and their tests. See [supabase/README.md](supabase/README.md).
- `lib/rules/`: the core rules from the design doc (topic picking, the inbox and "lessons waiting" reminders, review timing, the weekly recap, progress and prerequisites, milestones) as plain TypeScript functions with no database access. The tunable numbers are all in `lib/rules/constants.ts`.

No pages yet: those wait for the design scheme.

```sh
npm install
npm test           # core rule tests
npm run typecheck
```

Both test suites run on every pull request (`.github/workflows/test.yml`).
