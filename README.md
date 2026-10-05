# StudyNow

## The argument

StudyNow is a live learning commons for a course, school or open community. A
member can ask under a stable pseudonym, several people can answer the same
question, and the explanations remain attached to that question after the
session ends. It is designed for the moment when a learner is willing to admit
confusion, but not willing to perform that confusion in front of a class or an
endless social feed.

Good does not mean the largest education platform or the fastest automatic
answer. It means a small group can make uncertainty visible without making a
person feel exposed, then turn the help they give each other into memory that
later learners can find and trust.

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

## What the Crit 8 build protects

The first version enforces persistent groups, invitation membership, public
discovery, anonymous or named questions, and multiple independent answers.
SQLite writes the trace to the Fly volume rather than process memory. Contract
tests use two independent sessions to prove that private groups stay private,
membership changes access, anonymous posts do not reveal a chosen display
name, two people can answer one question, and their work survives a reload.

## What I chose not to build

This is not an LMS, a general chat server or an AI homework generator. There is
no university login integration, gradebook, follower graph, popularity ranking
or infinite feed. Image answers, a drawing surface, real-time delivery and
permission-aware semantic retrieval remain later project decisions. Shipping
their disabled controls now would make the interface look further along while
making the core less believable.

## Sources

- Amy Edmondson, [“Psychological Safety and Learning Behavior in Work Teams”](https://doi.org/10.2307/2666999), 1999.
- Eric Mazur Group, [“Peer Instruction: Getting Students to Think in Class”](https://mazur.harvard.edu/presentations/peer-instruction-getting-students-think-class-0).
- W3C Web Accessibility Initiative, [“Labeling Controls”](https://www.w3.org/WAI/tutorials/forms/labels/).
