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
Unsubmitted text held by one browser, outside shared state and activity logs.
