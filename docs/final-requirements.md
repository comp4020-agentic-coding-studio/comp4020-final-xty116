# Final project acceptance record

Source checked on 3 November 2026:
[Final project](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)
and [assessment rules](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/).
Deadline: 9 November 2026 at noon, Canberra local time. COMP4020 project,
not COMP8020: no research note is required.

## Course requirements

- Public deployed `*.fly.dev` application and all source/history in the course repository.
- At least two separate browser identities act on shared state and are distinguishable.
- Changes appear in other open sessions showing that state within about one second, without a reload or viewer action.
- Content survives return visits, server restarts and redeployment on the persistent `/data` volume.
- The complete README is server-rendered at `/readme/`, where marking starts.
- Define and defend what good means; align README, CLAUDE and executable checks.
- README about 400-600 words; rewritten PROCESS about 900-1100 words, with linked commit evidence and an argued stack/workflow choice.
- Preserve crit 8, 9 and 10 reflections and cutoff tags. The final state is the last pushed main-branch commit at the deadline.
- `pnpm check` and `pnpm check:evidence` pass. Both 1920x1080 and 390x844 are complete marking environments.
- Process is 50%, deployed app 25%, response to brief 25%. Green automation is evidence, not a predicted mark.

## User's product requirements

- A small group can begin with two people; any viewer can create a room and invite others.
- A teacher or organiser can create a school/course space and invite an entire class.
- A worldwide directory lets everyone discover and create public rooms.
- Anonymous questions support text, uploaded images and handwritten diagrams.
- Multiple people can independently answer one question, including concurrently.
- Model-assisted search finds conceptually similar existing questions and their explanations across accessible rooms.
- Every visible control works; the interaction and presentation are polished on phone and desktop.

## Marker access notice supplied by the user

Markers start from `/readme/` with only the URL and use two separate Chrome
profiles. Any additional setup requires a private Ed thread by Wednesday
4 November and confirmation, with the same free, brief instructions at the top
of `/readme/`. The planned marker journey requires only a browser and no account,
client, command, visitor API key or payment, so it does not introduce an
additional setup dependency. An unavailable optional model provider must be
reported honestly and must not prevent testing the three fixed requirements.

## Scope disclosures

Course organisation uses invitation possession, not university SSO, verified
employment, automatic enrolment or email delivery. Handwriting is attached as
a saved diagram; the drawing canvas is a private draft, not a shared live
whiteboard. Model retrieval uses text excerpts, not OCR or image understanding.
These boundaries must be explicit wherever the feature could imply more.
