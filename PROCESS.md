# Process overview

## From an open brief to a narrow loop

I did not begin with a feature list. I compared ideas across education,
operations, accessibility and consumer coordination against the same question:
does another person make the core interaction more valuable, or is “multi-user”
only decoration? StudyNow survived because its smallest loop already needs
other people: one learner risks a question, several peers offer genuinely
different paths through it, and the group keeps those paths as shared memory.

The original idea was much larger: teachers importing whole courses, public
world groups, images, a collaborative drawing board and LLM retrieval. For Crit
8 I reduced that to create or join a group, ask anonymously, and let two people
answer the same persistent question. The product rules in
[`59f2614`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/59f2614)
record the boundary before implementation: private content is authorised on
the server, anonymity is a display choice backed by a session, and popularity
mechanics do not decide which explanation matters.

## Harness before interface

I turned the checkable part of the Crit 8 claim into a running-app contract in
[`3e23482`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/3e23482).
The test opens two independent sessions, gives the owner a deliberately
recognisable display name, creates a private group, proves the second session
gets a 404, joins it through the invite code, and posts two answers. Its final
assertion is important: the question page contains both answers after another
request but not the owner's visible name. A separate check rejects a
cross-origin write. This let privacy, participation and persistence apply
backpressure before visual polish could disguise a missing rule.

## Stack decision

I kept Astro's server-rendered form model from the preceding full-stack crit,
but started the product source from nothing. I chose Astro SSR, Node and one
SQLite file rather than a React client plus a separate database. The course
provides one 256 MB machine and one persistent `/data` volume; SQLite fits that
deployment shape, keeps local and production behaviour close, and can support
the eventual real-time layer through server-sent events without requiring a
second service. The cost is deliberate: one writer and one app instance are
appropriate for a small learning commons, but this is not an architecture for
campus-wide scale. [ADR 001](docs/adr-001-stack.md) records the alternatives and
the point at which I should reconsider the choice.

The implementation in
[`de07056`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/de07056)
makes SQLite the source of truth for sessions, memberships, groups, questions
and answers. Public membership and invite membership share one path after
joining; private reads and every contribution are checked again on the server.
The browser never decides whether someone belongs.

## Correction and judgement

The first typecheck caught imports that climbed one directory too far from the
nested API routes. I corrected the path rather than weakening TypeScript's
coverage. The running contract then passed with two sessions. Visual checks at
exactly 1920×1080 and 390×844 found no horizontal overflow, but the mobile
header compressed its last navigation item and the image caption advertised
future sketch support. I tightened the mobile navigation and removed that
promise: a Crit 8 interface should show what works now, not disabled evidence
of ambition.

This first account is intentionally shorter than the final project's required
900–1100 words. I will rewrite it after Crits 9 and 10 as real-time behaviour,
observability and retrieval decisions create evidence worth defending.
