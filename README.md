# StudyNow

## The argument

StudyNow is a live learning commons where a member can ask under a stable
pseudonym, peers offer several explanations, and the group retains them. It
serves the moment a learner will admit confusion without performing it before
a class or social feed.

Good means a small group can make uncertainty visible without exposing someone,
then retain its help as trusted memory. It does not mean the largest platform
or fastest automatic answer.

## What good means here

**Safe enough to ask.** Amy Edmondson connects psychological safety with
learning behaviour: people need room to take interpersonal risks before a team
can learn from what they do not know. StudyNow therefore separates identity
from presentation. A contribution always belongs to a server-side session, but
peers see a stable anonymous name when its author chooses anonymity. Anonymous
does not mean unaccountable, and it must never mean invisible to moderation.

**More than one path through a problem.** Eric Mazur's work on Peer Instruction
treats explanation between learners as part of learning, not merely a cheaper
substitute for the teacher. StudyNow keeps multiple answers side by side. It
does not crown one response through likes, streaks or follower counts. A
concrete example, a correction and a formal derivation can all be useful to
different people.

**A memory with boundaries.** Public groups can become shared references;
invite-only courses cannot become public search material by accident. Every
read and write is authorised on the server. By the final version, semantic
search may summarise only material the current user can already open, and every
summary must link back to its questions and answers. “No relevant answer” is a
better result than an invented one.

**Quietly usable.** Asking and answering must work without client-side
JavaScript, at the desktop and phone marking viewports, with a keyboard and
clear form labels. The W3C's guidance that visible, associated labels make
forms more predictable informed the deliberately plain contribution forms.

## What the current build protects

StudyNow persists groups, invitation membership, anonymous questions and
independent answers in SQLite on Fly's volume. Contract tests prove private
groups stay private, membership changes access, anonymous posts hide a chosen
display name, and two people's work survives a reload.

The real-time layer broadcasts only work that has already been committed to
SQLite. Open group pages receive new questions and answer counts; open question
pages receive new explanations within a second without reloading. Aggregate
presence shows that peers are here without naming them. Drafts stay local;
reconnection restores visible regions from durable storage.

Every core write emits a structured `studynow.activity` line after server-side
checks. It correlates a pseudonymous actor with resource IDs and an outcome,
never cookies, invite codes, names or contribution text. Production activity is
live through `mise exec -- flyctl logs -a comp4020-final-xty116`.

## What I chose not to build

This is not an LMS, a general chat server or an AI homework generator. There is
no university login integration, gradebook, follower graph, popularity ranking
or infinite feed. Image answers, a drawing surface and permission-aware
semantic retrieval remain later project decisions. Shipping their disabled
controls now would make the interface look further along while making the core
less believable.

## Sources

- Amy Edmondson, [“Psychological Safety and Learning Behavior in Work Teams”](https://doi.org/10.2307/2666999), 1999.
- Eric Mazur Group, [“Peer Instruction: Getting Students to Think in Class”](https://mazur.harvard.edu/presentations/peer-instruction-getting-students-think-class-0).
- W3C Web Accessibility Initiative, [“Labeling Controls”](https://www.w3.org/WAI/tutorials/forms/labels/).
