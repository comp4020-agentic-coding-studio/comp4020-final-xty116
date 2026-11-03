# StudyNow

## Start here

[Open StudyNow](https://comp4020-final-xty116.fly.dev/). No account, installation,
API key or payment is required. Use two Chrome profiles (incognito works).
Each receives a durable identity; keep its cookies when returning.

1. In profile A, select **Create room**, enter a school and course, and keep
   **Invite only** selected. The creator becomes its organiser.
2. Copy the room invitation link into profile B and join. Alternatively, enter
   the six-character code through **Join**. Keep both profiles on this room.
3. A posts an anonymous question. Add text, an image, or a sketch; describe any
   visual. B sees it appear automatically. Both can open the same question and
   independently share explanations, including pictures and handwriting.
4. Keep A's question page open while B answers. The explanation appears without
   reloading, and A's unfinished draft stays intact. Presence counts people
   without displaying a roster. The author can mark the question understood.
5. Return through the same room or question URL tomorrow. Search its wording
   through **Find understanding** to rediscover it. Keyword search is always
   available; AI mode labels model matches and any service-unavailable fallback.

For a class, create up to 150 invitations, copy links or download CSV, and see
acceptance counts. **Explore** lists public rooms; example discussions are labelled.

Deployment note (3 November): AI currently falls back to keyword search because
the course model gateway is ANU-network-only. Browser collaboration is unaffected.

## What good means here

StudyNow is for the moment a learner can admit confusion to peers but would
hesitate before a whole class. Good means uncertainty can become shared
understanding without becoming a performance metric.

Edmondson's discussion of interpersonal risk in team learning [1] informs
anonymous posting and aggregate presence. Pseudonyms create continuity without
a named audience watching someone's uncertainty. This is a design hypothesis,
not evidence that anonymity alone produces psychological safety.

Mazur's Peer Instruction [2] gives the second commitment: explaining an idea
to another learner is part of learning. Several explanations remain available;
there is no winning answer, popularity ranking or automatic homework solution.
A photo of working or a handwritten diagram can express reasoning that a
text-only forum would make cumbersome.

The third commitment is reusable memory with boundaries. Public discussions
are discoverable; private course work stays inside its membership. AI finds
related existing discussions and links to them. It does not invent classmates
or silently promote a generated explanation into the conversation.

## Enforced and judged

The HTTP checks in `spec/` enforce separate identities, membership permissions,
anonymous presentation, concurrent explanations, attachment privacy, model
source filtering, real-time delivery and persistence across a process restart.
Writes commit before broadcast. Questions, answers, membership and image bytes
live on Fly's persistent volume. Reconnection rebuilds the displayed discussion;
drafts remain local. Operational logs exclude credentials and contribution text.

Visible labels, keyboard focus and feedback follow W3C guidance [3]. Automated
accessibility checks support manual judgement at 1920×1080 and
390×844. Readability, useful explanations and a welcoming tone still require
people's judgement; passing tests does not establish educational effectiveness.

## Deliberate boundaries

This is a learning commons, not a university enrolment system. An invitation
grants access by possession; school affiliation is not verified, and invitations
are distributed by the organiser rather than emailed automatically. Private
content is accessible to members and, on their deliberate AI request, its text
excerpts reach the configured model; names, images and drafts do not. Model
retrieval is bounded and rate-limited, with honest keyword fallback. There is
no gradebook, advertising or engagement score.

## Sources

1. Amy C. Edmondson, [Managing the risk of learning](https://www.hbs.edu/ris/download.aspx?name=02-062.pdf), 2002.
2. Mazur Group, [Peer Instruction: Getting Students to Think in Class](https://mazur.harvard.edu/presentations/peer-instruction-getting-students-think-class-0), 1999.
3. W3C WAI, [Labeling Controls](https://www.w3.org/WAI/tutorials/forms/labels/).
