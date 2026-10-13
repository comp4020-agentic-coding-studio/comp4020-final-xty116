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

The public deployment exposed a boundary unavailable locally: Fly terminates
HTTPS before forwarding plain HTTP to Astro. The original
same-origin check therefore rejected legitimate forms. I configured Astro to
trust only the exact Fly HTTPS domain, kept the application-level origin check,
added a full-stack regression test for that proxy shape, and repeated the
two-session flow against the live app.

## Real time without a second truth

For Crit 9 I defined the public seam before choosing a transport. In
[`d692900`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/d692900),
one authenticated browser holds a stream open while another creates a question;
the event must carry the resulting question ID in under one second. The first
run failed at a useful place, a missing endpoint returning 404. Server-sent
events were the smallest answer because StudyNow's writes already had reliable
form endpoints and the missing direction was only server-to-browser. WebSockets
would duplicate the write path and fast polling would make the one-second claim
by continuously asking the database whether anything happened.

The next contract in
[`cdc5b3d`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/cdc5b3d)
made answers live through the same channel and proved a non-member receives 404
from a private group's stream. The question and answer implementation commits
[`e9805b2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/e9805b2)
and
[`091b5d4`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/091b5d4)
keep SQLite ahead of the broadcast: an event exists only after its durable write
succeeds. An interrupted stream can therefore forget events safely; reconnecting
clients fetch the current regions from the database.

The harder product choice was presence. I considered a named roster, no signal,
and an anonymous count. The README's definition of good ruled out the roster:
showing exactly who is watching would put the spotlight back onto a learner's
uncertainty. The failing presence contract in
[`9f8a850`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/9f8a850)
therefore asks only for `activeLearners: 2` and explicitly rejects both display
names. [ADR 002](docs/adr-002-realtime-presence.md) records the choice and its
cost. My first green run still failed because the test demanded exact object
equality and rejected the harmless event `type`; changing it to assert only the
published fields corrected the harness rather than distorting the event format.

The browser layer in
[`345054f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/345054f)
replaces only question, answer and count regions. I verified it with an open
browser plus a second cookie session: a question and an answer appeared without
the URL changing or a reload. At 1920×1080 and 390×844 there was no horizontal
overflow. Stopping the server changed the visible state to `Reconnecting`;
starting it against the same SQLite file returned it to `Live` and restored the
new content. That manual interruption checked the part a green delivery timer
could not: what the learner sees when the happy path ends.

This account will grow once Crit 10 adds production observability. The remaining
work is not to invent a cleaner history, but to use logs and measurements to
test whether these decisions survive real concurrent use.
