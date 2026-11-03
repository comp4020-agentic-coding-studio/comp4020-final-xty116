# Building StudyNow

This account was assembled with Codex from the repository and the project's
recorded directions. The agent implemented and ran the checks; the product
direction came from the student: small study groups, teacher-led course rooms,
anonymous questions, several explanations, visual working and retrieval of
related discussions. [The acceptance record](docs/final-requirements.md)
separates those ambitions from the course's fixed requirements. The record
below distinguishes automated evidence from claims requiring human judgement.

## Choosing what good means

The first important decision was to build a learning commons rather than a
generic chat feed. The rules committed in
[`59f2614`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/59f2614)
put anonymous participation, private-course boundaries and several explanations
ahead of popularity mechanics. The initial implementation deliberately deferred
images and model retrieval while establishing a smaller durable loop. This was
not abandonment of the original direction: the final phase returns to those
requirements after the permission and persistence boundaries exist.

Edmondson's account of interpersonal risk informed anonymity and aggregate
presence; Mazur's Peer Instruction informed keeping alternative explanations.
Neither source establishes that this particular application improves learning.
The README now separates enforced claims from judged ones and cites W3C form
guidance for the accessible interaction. Its argument is that a useful peer
explanation should remain findable without turning uncertainty into a score.

## Stack and workflow

[ADR 001](docs/adr-001-stack.md) records the choice of Astro SSR, Node and SQLite
on the supplied persistent volume. A separate client application and hosted
database would add deployment and state boundaries to a one-machine project.
Server-rendered forms keep asking, joining and answering usable before browser
JavaScript starts. SQLite transactions keep membership and content together;
the accepted cost is one instance and limited write concurrency, not a claim
of campus-wide scale.

The workflow used small commits, public HTTP contracts and browser inspection.
The contract in
[`3e23482`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/3e23482)
creates two independent sessions, refuses a private read, joins through an
invitation and checks that both explanations survive another request. It also
gives the owner a recognisable display name and proves anonymous presentation
does not expose it. The implementation in
[`de07056`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/de07056)
puts the permission decision on the server, rather than treating hidden controls
as access control.

## Corrections that changed the harness

The first deployment exposed Fly's HTTPS termination: the app received HTTP
behind a public HTTPS origin. The correction kept the origin check, trusted
only the exact course domain and added a regression contract for that proxy
shape. A local green check alone had not established deployability.

For real time, the red contract in
[`d692900`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/d692900)
required another session to receive a question in under one second. SSE fitted
the existing form writes better than a second bidirectional protocol. The
question and answer commits
[`e9805b2`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/e9805b2)
and
[`091b5d4`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/091b5d4)
broadcast only after durable writes. Reconnection can rebuild from SQLite
instead of needing every missed event.

Presence required a product judgement. [ADR 002](docs/adr-002-realtime-presence.md)
chooses an anonymous count over a named roster. Its test in
[`9f8a850`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/9f8a850)
rejects the deliberately recognisable display names. The browser work in
[`345054f`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/345054f)
replaces discussion regions while preserving the composer. That distinction
matters when one learner is still writing while another posts.

## Operational identity

Crit 10 treated stdout as an interface. The contract in
[`9685afe`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/9685afe)
starts the production build and follows two sessions through shared state.
[`897a067`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/897a067)
adds structured activity events. Later tests exposed the success-only blind
spot; the correction in
[`ad54a38`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/ad54a38)
includes rejected joins and denied answers. [ADR 003](docs/adr-003-operational-identity.md)
explains why logs use a session hash instead of its credential or a display
name. The earlier crit tags remain unchanged as historical evidence.

## Completing visual peer learning

The final-phase direction specifically rejected stopping at text-only rooms.
[`3fb2b9a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/3fb2b9a)
stores images and handwritten PNGs transactionally with their contributions.
An HTTP contract retrieves each image as its owner and receives 404 as a
stranger. [ADR 004](docs/adr-004-visual-retrieval.md) weighs database BLOBs against
ephemeral files and another storage service. Upload bounds and descriptions
became explicit rules rather than relying on the file picker.

The invitation contract first failed with a missing endpoint.
[`23dc90a`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/23dc90a)
adds organiser-only class lists, one-use acceptance and roster privacy. It
deliberately does not claim verified university enrolment or automatic email.
[`6ea764e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/6ea764e)
integrates a common composer with image previews, drawing, undo, redo and draft
recovery. Signature Pad supplies the stroke engine; Lucide supplies consistent
icons. Browser inspection included drawing and publishing an actual sketch at
the phone marking viewport, not just checking that a canvas existed.

The interface revision also corrected the first-visit hierarchy. A large empty
"your rooms" panel initially pushed the useful public room below the first
screen. New visitors now see a joinable room immediately; the photographic
banner has a stable height instead of sizing itself from its image. Labels and
secondary copy were darkened and enlarged after inspecting the phone view.
These changes protect the act of finding a study space, not just a preferred
colour palette. Dialogs retain ordinary destination links for the no-script
path, while native dialog behaviour supplies focus containment and Escape.

## Retrieval and acceptance

[`5266365`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/5266365)
implements model-assisted retrieval of existing discussions. Authorised
candidates are selected before the request; suggested IDs are checked again
after it. Its upstream-contract test deliberately proposes an inaccessible ID
and a fabricated one, then simulates provider failure. The expected results
are linked authorised questions or explicitly labelled keyword fallback.
This tests the boundary, not live provider availability. Deployment credentials
and connectivity require a separate operational check.

The same production-process test stops and restarts the app against its retained
database, then verifies both persisted content and private access. Structural
axe checks complement browser inspection, rather than substituting for visual
readability or educational judgement. The final acceptance record links the
course requirements to the deployed state, CI and remaining operational limits;
it does not treat a green suite as a promised grade.

Independent standards and specification reviews found a subtler concurrency
failure: a new search could finish before an older refresh, leaving a peer
update queued forever. The regression in
[`434e6ef`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/434e6ef)
reproduces that ordering through form events and delayed HTTP responses; it
fails with only two requests where a third is required. The correction in
[`495a9a9`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/495a9a9)
drains the queue after releasing the refresh lock. It also checks that unfinished
query text is preserved and never sent by a background update.

## Visual evidence

The workspace and phone question illustrate the interface in
[`6ea764e`](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/6ea764e),
with the review corrections above. [Recovered sketch](docs/evidence/draft-recovery-phone.jpg)
and [live search](docs/evidence/search-live-desktop.jpg) capture the corresponding
manual checks. [Verification notes](docs/verification.md) distinguish local,
browser and live-service evidence.

![Workspace at the desktop marking viewport](docs/evidence/workspace-desktop.jpg)
![Posted handwritten question at the phone marking viewport](docs/evidence/question-phone.jpg)
