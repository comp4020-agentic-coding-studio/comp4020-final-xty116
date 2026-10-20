# Crit 10 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was treating stdout as an interface rather than somewhere to
leave debugging sentences. I wrote a contract that starts the built production
server, drives it with two independent Cookie sessions, and reads the same
stream that `flyctl logs` exposes. The first failure was clean: every user
action worked, but there was no operational account of it.

My first green version recorded only successful actions. A second failing test
showed the blind spot: the most important evidence of server-side permission is
often an action that did not happen. Logging denied questions and answers made
the permission boundary observable without storing the rejected drafts.

## What did this work change about who I want to be as a software developer?

I want to design operational visibility with the same care as the visible
interface. “Log the user” sounded simple until I separated three identities:
the Cookie session is a credential, the anonymous label is a social promise,
and the actor fingerprint is an operational correlation key. Reusing the first
would be unsafe; using a display name would weaken the second.

That distinction changed my idea of accountable software. Accountability does
not require collecting every available detail. A timestamp, pseudonymous actor,
action, outcome and resource ID are enough to reconstruct the shared-state
story. Leaving names, invite codes and contribution text out of the log is not
missing instrumentation; it is evidence that the instrumentation has a purpose
and a boundary.
