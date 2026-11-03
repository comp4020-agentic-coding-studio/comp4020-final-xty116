# Draft private Ed question: supported server-side model access

This is a draft for the student to review and send, not a posted message.
Do not include the API key in the thread.

**Subject:** Final project: supported model gateway from the course Fly app?

My final project is StudyNow:
https://comp4020-final-xty116.fly.dev/readme/

The browser-only two-profile journey works without a login, command, API key
or payment. Shared questions, concurrent explanations and persistent visual
attachments are available independently of AI search.

I would also like to offer server-side, permission-scoped model retrieval of
similar discussions. The course key works locally with the ANU VPN, but the
Fly app cannot reach strproxy. I understand the published ANU-network-only
restriction and am not trying to bypass it. The deployed UI currently labels
its keyword fallback, rather than claiming a model result.

Is there a supported, publicly reachable gateway or approved deployment
arrangement for this use? If so, could you confirm the endpoint, authentication
method, model and any allocation/privacy conditions? Credentials would remain
in encrypted GitHub/Fly secrets, never source code or browser storage.

This is not a request for markers to connect a VPN or run a local service.
The current app needs no extra marker setup. If an approved solution would
change that, I will describe it at the top of `/readme/` and seek explicit
confirmation before the Wednesday 4 November exception deadline.
