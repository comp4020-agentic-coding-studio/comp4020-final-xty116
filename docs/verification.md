# Verification record

Final acceptance work, 3 November 2026. The course's
[brief and marking rules](final-requirements.md) are the source of the checklist.

## Automated evidence

`pnpm check` type-checks the application, builds the production server and runs
the executable contracts. The new tests cover:

- valid image and handwritten contributions, description requirements and private attachment access;
- rejection of truncated image bytes that possess a plausible signature;
- owner-only class invitations, hidden roster labels and single-use acceptance;
- search across question and answer text without private-course leakage;
- simultaneous answers and author/organiser-only understood status;
- model selection of real, authorised sources and labelled upstream-failure fallback;
- text, membership and private image access across a real production-process restart;
- structural WCAG checks on the eight core routes (colour contrast requires browser judgement);
- a browser-event regression that reproduces overlapping search requests and preserves unsent query text;
- activity logging for denied status changes, alongside existing actor-correlation checks.

The course's two shipped invariant checks are retained. `pnpm check:evidence`
checks all three crit reflections and resolves the process account's commit
citations. A model upstream test double is evidence about integration behaviour,
not evidence of production connectivity.

The completed local run passed all 18 tests in nine files, with zero Astro
errors, warnings or hints. Evidence checking resolved 17 cited commits.
The course secret scanner completed both worktree and history scans and
reported only its broad credential-assignment heuristic. Manual review
identified environment-variable references, an Astro route parameter, and the
deliberately non-working local upstream fixture. No concrete credential-shaped
finding was reported. The actual model key is outside the repository.

## Browser evidence

The app was exercised at 1920x1080 and 390x844. The desktop document width was
1920 with no horizontal overflow, and the banner action stayed within its band.
The phone drawing test made actual strokes, used undo/redo and published the
saved PNG, which rendered on its question page.

A separate draft put strokes near the lower-right canvas edge. After a same-size
reload the restored bitmap measured 344x213, rather than the default 300x150;
the far-edge strokes remained visible. The text draft and image description
were retained. See [recovered sketch](evidence/draft-recovery-phone.jpg).

With a question open in the browser, an independent HTTP cookie session joined
the room, opened its event stream and posted an explanation. The browser showed
two learners and the new explanation, without changing its URL. The existing
text and drawing drafts remained. A second peer write then changed an open
search result from one explanation to two without submitting the different,
unfinished query in its input. See [live search](evidence/search-live-desktop.jpg).

These tests combine a real browser with independent HTTP identities. Markers
should still follow the README journey in two separate Chrome profiles; this
record does not claim an in-person classroom learning study.

## Operational evidence

The configured course Claude proxy returned HTTP 200 and an actual model reply
after VPN connectivity was confirmed. At the student's explicit approval,
the key, provider URL and model name were stored as encrypted GitHub secrets
for the course repository. They are staged into Fly through CI, without being
printed, committed, or sent to the browser. Production retrieval is verified
separately after deployment.

The application requires no marker account, command, API key or payment. The
first section at `/readme/` gives its complete browser-only entry sequence.
There is no additional marker setup requiring the private-Ed exception.

## Disclosed boundaries

An invitation proves possession, not school enrolment; lists are distributed
by the organiser, not sent through SMTP. Drawings are private drafts until
posted, not a shared live whiteboard. Images are not OCR-indexed. Model
retrieval is bounded, rate-limited and preserves source links. Production
provider outages are labelled as keyword fallback, not reported as AI success.
