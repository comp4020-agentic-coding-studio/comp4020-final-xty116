# StudyNow

Shared language for identity, collaboration and operational evidence in the
StudyNow learning commons.

## Language

**Viewer**:
A person represented by one durable server-side browser session. Another
browser profile represents another viewer.
_Avoid_: User, account

**Anonymous label**:
A stable, friendly pseudonym used when a viewer contributes anonymously. It is
recognisable but not guaranteed unique.
_Avoid_: Username

**Actor ID**:
A stable, non-secret correlation key for operational logs. It distinguishes
viewers but never authorises a request.
_Avoid_: Session ID, user ID

**Activity event**:
A structured server-side account of a completed core write or authorisation
denial, limited to actor, action, outcome and resource references.
_Avoid_: Audit history

**Draft**:
A text or visual contribution that has not been shared with a room.

**Room**:
A learning space with shared questions, explanations and a membership boundary.
A course room records its school and subject; a public room is discoverable by everyone.
_Avoid_: Channel, classroom account

**Organiser**:
The viewer who creates a room and manages its invitations. An organiser may be
a teacher, but the role does not prove employment or enrolment.
_Avoid_: Verified teacher, administrator

**Explanation**:
One person's contribution to understanding a question, expressed through text,
images or handwriting. Several explanations can coexist.
_Avoid_: Best answer, generated solution

**Similar question**:
An existing discussion whose underlying idea may help with the present question.
_Avoid_: AI answer
