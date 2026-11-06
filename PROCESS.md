# Building StudyNow

This account was assembled with Codex from the repository and the student's
recorded directions: small groups, course invitations, anonymous questions,
visual working, several explanations and retrieval. The agent implemented and
checked the system; this document does not invent student interviews or personal
experiences. The [detailed evidence appendix](docs/process-evidence.md) expands
the incidents below; [verification notes](docs/verification.md) distinguish
automated, browser and operational evidence.

## From a feature list to a learning commons

The student's stated gap is a place for groups to gather around questions as
they arise, with worldwide participation and text, images and handwriting for
working through them. That priority makes co-presence and expressive explanations
central; anonymity supports participation but is not the whole purpose.

The initial risk was building a generic chat room with educational labels.
[59f2614](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/59f2614)
turned the direction into rules: retain different explanations, protect
private-course boundaries and avoid popularity scores. The final argument uses
[Edmondson's account](https://www.hbs.edu/ris/download.aspx?name=02-062.pdf) of
interpersonal risk to consider anonymity;
[Mazur's Peer Instruction](https://mazur.harvard.edu/presentations/peer-instruction-getting-students-think-class-0)
supports asking learners to explain reasoning. Neither establishes StudyNow's
educational effectiveness. The README makes that distinction and cites its
sources. The chain is specific: "safe participation" becomes server-side membership
and anonymous presentation rules, then outsider-read and name-leak tests.
"Useful tomorrow" becomes persistent storage, then restart checks. Whether the
explanation actually helps remains a human judgement, not an assertion hidden
inside a passing test.

Images and retrieval were initially deferred until joining, asking and answering
were durable. That sequencing reduced the number of simultaneous unknowns;
it did not redefine the original request as text-only. Class invitations later
remained possession-based rather than pretending to verify teachers or enrolment.

## Why this stack and workflow

[ADR 001](docs/adr-001-stack.md) compares Astro SSR and SQLite with a separate
React/Express client and a managed backend. One 256 MB machine and one volume
favoured one rendering and permission boundary. Native HTTP forms keep core
actions usable without JavaScript; SQLite transactions keep contributions
consistent on persistent storage. The costs are synchronous database work,
bounded write concurrency and no horizontal replicas.

The agent workflow paired bounded changes with running-app contracts and
browser inspection, not private-helper tests alone.
[3e23482](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/3e23482)
defines two cookie identities, denied private reads, invitation acceptance and
anonymous contributions;
[de07056](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/de07056)
implements them. The test deliberately chooses a recognisable display name
and checks that anonymous posts do not reveal it. This makes privacy observable,
rather than a hidden-button convention. Not every feature began red; the cited
test-first sequences are specific examples, not a claim about every commit.
This is slower than accepting the agent's summary, but tests the same URLs and
cookies users exercise. Browser inspection handles what these contracts cannot:
hierarchy, visible controls and the recoverability of partially written work.

## Deployment changed the harness

The first live forms failed because Fly terminates HTTPS before forwarding HTTP.
Removing origin protection would hide the symptom by weakening security.
[e0af07b](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/e0af07b)
instead trusts the exact course proxy host and adds its forwarded-header
regression while retaining cross-origin rejection. Local success had not tested
the production request boundary.

## Real time without exposing private thinking

[d692900](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/d692900)
requires a second session to receive a question within one second.
[e9805b2](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/e9805b2)
and
[091b5d4](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/091b5d4)
broadcast committed questions and explanations through SSE. Existing form writes
made a one-way channel simpler than WebSockets; reconnection rebuilds from SQLite
instead of requiring replay of every event.

[ADR 002](docs/adr-002-realtime-presence.md) rejects both a named roster and total
invisibility in favour of aggregate presence. The contract in
[9f8a850](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/9f8a850)
excludes recognisable names.
[345054f](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/345054f)
patches discussion regions, never the composer. The trade-off is weaker direct
coordination, accepted to keep reading and unfinished reasoning private.

## Observability is not another identity leak

[9685afe](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/9685afe)
starts the built server and inspects stdout;
[897a067](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/897a067)
adds correlated activity events. Later contracts exposed missing denial paths;
[ad54a38](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/ad54a38)
records rejected collaboration too. [ADR 003](docs/adr-003-operational-identity.md)
explains the compromise: a short session digest distinguishes actors without
printing their authentication cookies, names or contributions. That digest
correlates activity; it never grants access.

## Completing and correcting visual participation

[3fb2b9a](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/3fb2b9a)
commits image bytes and their contribution together. [ADR 004](docs/adr-004-visual-retrieval.md)
rejects ephemeral image files and an extra object-store dependency, accepting a
larger SQLite database.
[23dc90a](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/23dc90a)
adds organiser-only rosters and single-use invitations after its endpoint
contract initially failed.
[6ea764e](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/6ea764e)
integrates Signature Pad, image previews and recoverable drafts.

Review in
[434e6ef](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/434e6ef)
found plausible image headers did not prove decodable pixels, and restored
sketches could clip at the canvas's default bitmap size. Full Sharp decoding
and sizing before stroke restoration corrected those assumptions. Malformed-byte
rejection became an executable check; restored edge strokes were inspected
in the browser. The phone layout correction in
[6af3219](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/6af3219)
also keeps the commons action within its band. The earlier empty-room panel
pushed useful public discussion below the first screen; the revised first visit
offers a joinable example immediately. Native dialogs retain ordinary links,
focus containment and Escape. These decisions serve the question-to-explanation
journey rather than adding decorative screens.

## Retrieval, concurrency and honest limits

[5266365](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/5266365)
retrieves existing discussions instead of generating an authoritative answer.
The server authorises candidates before model contact and validates returned IDs
again. Its fake upstream proposes forbidden and invented IDs, then fails; the
contract requires filtered sources and labelled keyword fallback. Names, images
and drafts stay out of model context.

A specification review exposed an ordering failure: a newer search finished
before an older refresh, stranding a queued peer update. The regression in
[434e6ef](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/434e6ef)
expects a third request but initially observes two.
[495a9a9](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/495a9a9)
drains queued work after releasing the refresh lock. The same test checks that
unfinished input remains local, connecting a concurrency correction to the
privacy rule.

Production exposed another boundary: the course model works from the student's
VPN-connected computer but its ANU-only gateway is unreachable from Fly.
[6af3219](https://github.com/comp4020-agentic-coding-studio/comp4020-final-xty116/commit/6af3219)
discloses this failure. A contract-test reply is not production AI success.
The app therefore retains keyword retrieval and tells visitors which mode they
received. Solving the dependency requires an authorised reachable provider, not
a visitor-supplied key, a laptop left running or an undocumented marker setup.

## What acceptance establishes

The recorded acceptance run passed 18 tests; ten additional checks exercised the
public deployment. A real process restart preserved private text and images;
a live redeploy preserved submitted records. At 1920x1080 and 390x844, browser
checks exercised sketch publication, draft recovery and peer updates without
reloads. These are agent-operated checks, not a two-classmate usability study.
The preserved crit tags and linked commits let a reader reconstruct the work.

What remains judged is whether learners find explanations useful and feel safe
asking. The sources guide those choices but cannot replace actual classroom
feedback. The detailed appendix records limitations alongside each result.

![Desktop workspace](docs/evidence/workspace-desktop.jpg)
![Posted sketch on a phone](docs/evidence/question-phone.jpg)
