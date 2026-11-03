# ADR 004: Keep visual reasoning durable and model retrieval accountable

The final version needs photos, handwritten reasoning, class invitations and
conceptual search without breaking its small-machine architecture or anonymous
participation. Media bytes and their parent contribution are committed in the
same SQLite transaction on `/data`; retrieval selects authorised discussions
before contacting a model, and validates every suggested source ID afterward.

## Alternatives and consequences

An external object store would add another credential, lifecycle and failure
boundary. Loose files on the Fly image would disappear during redeployment.
SQLite BLOBs keep the existing one-volume persistence contract and make an
attachment impossible to publish without its parent. The cost is a larger
database and backups; uploads are bounded to three attachments, 2 MB per image
and an 8 MB request. PNG, JPEG and WebP bytes are checked; SVG is excluded.
Attachment reads enforce the same membership rule as their question.

A general chatbot could produce an attractive explanation without preserving
who reasoned through the problem. Instead, AI mode reranks up to 40 accessible
discussions, drawn from a bounded recent corpus of 1,200 questions and their
answers. It returns linked questions with similarity reasons. This does not
guarantee exhaustive semantic recall, and handwritten content is not OCR'd.
It keeps the source of an explanation inspectable and avoids pretending model
output is another classmate. Names, images, drafts and invitation credentials
are excluded from model context. Private question text can be sent only on a
member's deliberate AI-search request, disclosed beside that control.

The integration accepts Anthropic messages or an OpenAI-compatible service.
Provider failure, invalid JSON or exhausted allowance produces explicitly
labelled keyword results. The server allows six requests per minute and forty
per day per viewer, with a shared daily allowance of 300. Credentials belong
in encrypted deployment secrets. A local upstream test double proves filtering
and failure behaviour; live provider connectivity must be checked independently.

A university login would establish stronger identity but creates access steps
for markers and is not available from the course's supplied infrastructure.
Class organisers instead generate one-use invitation links from a private list
and distribute them through their existing class channel. Accepting a link
binds membership to that browser session. This is possession-based admission,
not email delivery or verified enrolment. A reusable group code remains a
convenient alternative; sharing it deliberately grants entry.
