# Crit 9 reflection

## What was the breakthrough that moved the work forward?

The breakthrough was realising that “real-time” did not require turning
StudyNow into chat. The durable action was already clear: a learner deliberately
submits a question or explanation through an authorised form. What was missing
was a way for everyone else to learn that the database had changed. Keeping
those responsibilities separate made server-sent events an obvious fit. It also
gave me a useful rule: SQLite is truth, while the stream is only a prompt to
look again.

That rule became more valuable during the restart test. The page moved from
Live to Reconnecting, then recovered the new question and answer from SQLite
without a reload. I was no longer testing only whether an event arrived quickly;
I was testing whether the experience remained honest when an event could be
missed.

## What did this work change about who I want to be as a software developer?

I want to be more suspicious of features that satisfy a technical brief while
quietly changing the social character of a product. A named presence list would
have made the app visibly multi-user, but it would also expose who was watching
someone's uncertainty. Choosing an anonymous count kept the sense of shared
attention without undoing the psychological safety argument in the README.

I also want tests that constrain promises rather than incidental shapes. One
presence test initially rejected a valid event because it contained an extra
`type` field. Narrowing that assertion was a small correction, but it clarified
the kind of harness I want: strict about privacy, timing and access; flexible
about implementation details that do not change the learner's experience.
