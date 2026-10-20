# ADR 003: Correlate activity without logging credentials or contribution text

## Status

Accepted for Crit 10. Revisit if StudyNow gains authenticated institutional
accounts, moderation workflows or a separate log store with its own access
controls.

## Context

StudyNow already distinguishes people with server-side browser sessions. A
session owns memberships and contributions even when the interface presents a
stable anonymous label. Crit 10 requires an operator watching production logs
to tell two people apart and narrate what each did.

The session identifier is also the Cookie credential. Printing it would turn
the log into a source of reusable access. Printing display names would make the
operational surface less private than the product. Anonymous labels alone are
safer and readable, but their small vocabulary means two viewers can receive
the same label. Logging contribution bodies or invite codes is unnecessary for
correlating an action and would retain sensitive material in another system.

## Options considered

1. Log the full session identifier. This is unique and requires no derivation,
   but exposes the credential that authorises the browser.
2. Log the viewer's display name. This is readable, but names can change and it
   defeats the choice to participate anonymously.
3. Log only the anonymous label. This preserves presentation privacy, but
   cannot reliably distinguish two viewers.
4. Log a short digest of the session identifier beside the anonymous label,
   with action, result and resource IDs only.

## Decision

Choose option 4. Each core write that succeeds, and each write denied by a
membership check, emits one JSON line to standard output. `actorId` is the
first twelve hexadecimal characters of SHA-256 over the high-entropy session
identifier. `actorLabel` is the viewer's stable anonymous label. The event also
records an ISO timestamp, action, result and the group or question IDs needed
to follow the shared-state change.

The actor ID is for correlation, never authorisation. Logs exclude raw session
IDs, Cookies, invite codes, display names, form bodies and drafts. SQLite
remains the source of truth; the log is an operational account, not another
write model. Fly captures stdout, so the live view is the normal `flyctl logs`
tail rather than a public diagnostics page.

## Consequences

An operator can distinguish two browser profiles, connect their actions across
requests and see successful, denied and invalid outcomes without reading their
work. Friendly labels keep the tail narratable while actor IDs remove label
ambiguity. A twelve-character digest has a theoretical collision risk, accepted
for this prototype's scale. Log retention belongs to the hosting platform, so
durable product history still comes from SQLite. The logging mechanism and its
tests remain in the repository after the crit.
