# ADR 002: Show that people are present without naming them

## Status

Accepted for Crit 9. Revisit if StudyNow adds an explicit, consent-based study
session where participants need to address one another directly.

## Context

StudyNow now delivers a submitted question or explanation to every other open
session within about a second. Transport alone does not decide what people
should know about one another while they share a group. The README defines good
as making uncertainty visible without making the learner feel exposed. A live
feature that publishes a roster could undermine the reason anonymous questions
exist.

Draft text is also sensitive. A learner may try an explanation, reconsider it,
and delete it. Real-time collaboration must not turn that private thinking into
content before the learner deliberately submits it.

## Options considered

1. Show a named roster of everyone with the group open. This supports direct
   coordination but makes presence another identity signal and can expose who
   is reading a private question.
2. Show no presence at all. This protects privacy, but gives no sense that the
   shared space is live until somebody submits something.
3. Show only the number of distinct sessions currently connected. Keep drafts
   local and broadcast only durable, submitted questions and answers.

## Decision

Choose option 3. Each authorised group stream counts distinct server-side
sessions, not tabs, and sends only an aggregate `activeLearners` value. It never
sends display names or anonymous labels. Questions and answers are appended to
SQLite before their events are broadcast. Draft fields are never transmitted
by the live channel.

Server-sent events carry this one-way traffic because writes already use normal
HTTP forms. The browser locally replaces only the question or answer regions,
so a live update cannot erase another form's draft. On reconnect it fetches
those regions from SQLite, which remains the source of truth.

## Consequences

Learners get a quiet signal that they are not studying alone without becoming
a roster. Simultaneous answers append independently instead of overwriting one
another. The cost is weaker direct coordination: somebody cannot see that a
particular classmate is present or address them through StudyNow. Presence is
also process-local and intentionally disposable; after a server restart the
count rebuilds as browsers reconnect, while submitted work survives on the Fly
volume.
