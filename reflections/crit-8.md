# Crit 8 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was separating the whole StudyNow vision from the smallest
proof that it is alive. I wanted institutional course groups, public rooms,
images, handwriting and model-assisted retrieval. None of those proves the
central idea. The useful core is smaller: one person can ask without putting
their name in the spotlight, a second person can enter the group and answer,
and both contributions remain after the page or server returns. Treating
anonymity as a presentation layer over a persistent session made the rest of
the architecture clearer. It gave the server something to authorise without
forcing the learner to perform a public identity.

Writing the two-session test before the interface also changed the pace of the
work. “Anonymous” stopped being a checkbox and became a falsifiable claim: the
page must not contain the owner's deliberately recognisable display name.

## What did this work change about who I want to be as a software developer?

I want to become a developer who can make an ambitious idea smaller without
making it generic. My earlier instinct was to prove seriousness through feature
count. This build made boundaries feel more serious: who may read a course,
what survives a restart, and whether a quiet learner can contribute without
becoming a metric. I also want my process to leave reasons behind. The stack
decision, contract tests and explicit omissions give the next version something
stronger to argue with than a pile of code that happens to run.
