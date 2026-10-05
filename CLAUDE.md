# StudyNow working agreement

Build a live learning commons where asking a question feels safe, several
explanations can coexist, and today's help remains useful tomorrow.

## Product rules

- Keep the core loop short: join a group, ask anonymously, read several
  answers, and add another explanation.
- Treat anonymity as a presentation choice, not an absence of accountability.
  Every contribution belongs to a server-side session, while peers see only a
  stable pseudonym when anonymity is selected.
- Enforce group visibility on the server. Content from an invite-only course
  must never appear to a non-member or in a public listing.
- Preserve different explanations instead of collapsing them into one ranked
  answer. Do not add popularity scores, follower counts, streaks, or other
  mechanics that make asking for help performative.
- Be honest about scope. Invite links are a prototype for enrolment, not an
  integration with a university identity or learning-management system.

## Engineering rules

- Keep SQLite as the single source of truth and store the production database
  under `/data`, the course-managed persistent Fly volume.
- Keep schema changes explicit and additive. Enable foreign keys and WAL mode
  at startup, and never depend on in-memory state for user-visible content.
- Authorise every read and write on the server. A hidden button is not an
  access-control rule.
- Keep the no-JavaScript form path usable. JavaScript may add live updates in
  later crits, but it cannot be the only way to ask, join, or answer.
- Reject cross-origin writes, validate lengths at the boundary, and escape all
  user content before it reaches HTML.
- Preserve `fly.toml`, the supplied Docker constraints, and the `/readme/`
  contract. Test product behaviour through the running production build.

## Experience rules

- Optimise first for the marking viewports, 1920x1080 and 390x844, without
  hiding essential actions.
- Make the application the first screen. Prefer a calm, editorial workspace to
  a marketing page or a feed designed for endless scrolling.
- Use semantic landmarks, explicit labels, useful empty states, visible
  keyboard focus, and status messages announced with `aria-live`.
- Keep controls stable and text readable. Every visible action must work; do
  not ship disabled previews of future image, drawing, AI, or real-time tools.

## Verification rules

- Add an HTTP contract test before or with every important product promise.
- Run `pnpm check` and `pnpm check:evidence` before each deploy.
- Test a second independent session, a reload, a server restart, and both
  marking viewports before calling a milestone complete.
- Never commit credentials, local databases, build output, or
  `mise.local.toml`.
