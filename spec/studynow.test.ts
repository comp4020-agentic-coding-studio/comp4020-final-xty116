import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");

function cookieFrom(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  if (!cookie) throw new Error("StudyNow did not issue a session cookie");
  return cookie;
}

async function newSession(): Promise<string> {
  const response = await fetch(new URL("/", baseUrl), { redirect: "manual" });
  expect(response.status).toBe(200);
  return cookieFrom(response);
}

async function post(
  path: string,
  cookie: string,
  fields: Record<string, string>,
  origin = baseUrl,
): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie,
      origin: new URL(origin).origin,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
  });
}

function idFrom(location: string | null, kind: "groups" | "questions"): number {
  const match = location?.match(new RegExp(`/${kind}/(\\d+)`));
  if (!match) throw new Error(`No ${kind} id in redirect: ${location ?? "missing"}`);
  return Number(match[1]);
}

async function waitForServerEvent(
  response: Response,
  eventName: string,
  timeoutMs = 1_000,
): Promise<Record<string, unknown>> {
  if (!response.body) throw new Error("Realtime response has no body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const readEvent = async (): Promise<Record<string, unknown>> => {
    while (true) {
      const boundary = buffer.indexOf("\n\n");
      if (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const lines = frame.split("\n");
        const name = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
        const data = lines.find((line) => line.startsWith("data:"))?.slice(5).trim();
        if (name === eventName && data) return JSON.parse(data) as Record<string, unknown>;
        continue;
      }

      const chunk = await reader.read();
      if (chunk.done) throw new Error(`Realtime stream ended before ${eventName}`);
      buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, "\n");
    }
  };

  return Promise.race([
    readEvent(),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${eventName} did not arrive within ${timeoutMs}ms`)), timeoutMs);
    }),
  ]).finally(() => reader.cancel());
}

it("supports a private, persistent, anonymous multi-person study flow", async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const owner = await newSession();
  const learner = await newSession();

  const profile = await post("/api/profile", owner, { displayName: `Visible Owner ${suffix}` });
  expect(profile.status).toBe(303);

  const created = await post("/api/groups", owner, {
    name: `Contract Test ${suffix}`,
    institution: "Test University",
    courseCode: `TEST${suffix}`,
    description: "A private room used to verify the StudyNow contract.",
    visibility: "private",
  });
  expect(created.status).toBe(303);
  const groupId = idFrom(created.headers.get("location"), "groups");

  const ownerView = await fetch(new URL(`/groups/${groupId}`, baseUrl), {
    headers: { cookie: owner },
  });
  expect(ownerView.status).toBe(200);
  const ownerHtml = await ownerView.text();
  const inviteCode = ownerHtml.match(/data-invite-code>([A-Z0-9]{6})</)?.[1];
  expect(inviteCode).toBeTruthy();

  const hiddenFromStranger = await fetch(new URL(`/groups/${groupId}`, baseUrl), {
    headers: { cookie: learner },
  });
  expect(hiddenFromStranger.status).toBe(404);

  const joined = await post("/api/groups/join", learner, { inviteCode: inviteCode! });
  expect(joined.status).toBe(303);
  expect(idFrom(joined.headers.get("location"), "groups")).toBe(groupId);

  const asked = await post(`/api/groups/${groupId}/questions`, owner, {
    title: `Why does this persist? ${suffix}`,
    body: "Explain the difference between process memory and durable storage.",
    anonymous: "on",
  });
  expect(asked.status).toBe(303);
  const questionId = idFrom(asked.headers.get("location"), "questions");

  const firstAnswer = await post(`/api/questions/${questionId}/answers`, owner, {
    body: "Process memory disappears when the server restarts.",
    anonymous: "on",
  });
  expect(firstAnswer.status).toBe(303);

  const secondAnswer = await post(`/api/questions/${questionId}/answers`, learner, {
    body: "Durable storage survives because it is written outside the process.",
    anonymous: "on",
  });
  expect(secondAnswer.status).toBe(303);

  const persisted = await fetch(new URL(`/questions/${questionId}`, baseUrl), {
    headers: { cookie: learner },
  });
  expect(persisted.status).toBe(200);
  const html = await persisted.text();
  expect(html).toContain(`Why does this persist? ${suffix}`);
  expect(html).toContain("Process memory disappears when the server restarts.");
  expect(html).toContain("Durable storage survives because it is written outside the process.");
  expect(html).not.toContain(`Visible Owner ${suffix}`);
});

it("rejects a cross-origin write", async () => {
  const cookie = await newSession();
  const response = await post(
    "/api/groups",
    cookie,
    {
      name: "Should not exist",
      institution: "Elsewhere",
      courseCode: "BAD1000",
      description: "Cross-origin requests must not mutate the database.",
      visibility: "public",
    },
    "https://attacker.example",
  );
  expect(response.status).toBe(403);
});

it("accepts the public HTTPS origin behind Fly's HTTP proxy", async () => {
  const cookie = await newSession();
  const response = await fetch(new URL("/api/profile", baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie,
      origin: "https://comp4020-final-xty116.fly.dev",
      "content-type": "application/x-www-form-urlencoded",
      "x-forwarded-host": "comp4020-final-xty116.fly.dev",
      "x-forwarded-proto": "https",
    },
    body: new URLSearchParams({ displayName: "Fly Proxy Learner" }),
  });

  expect(response.status).toBe(303);
});

it("delivers a new question to another open session within one second", async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const owner = await newSession();
  const learner = await newSession();

  const created = await post("/api/groups", owner, {
    name: `Realtime Contract ${suffix}`,
    institution: "Test University",
    courseCode: `LIVE${suffix}`,
    description: "A private room used to verify live delivery between two sessions.",
    visibility: "private",
  });
  const groupId = idFrom(created.headers.get("location"), "groups");
  const ownerView = await fetch(new URL(`/groups/${groupId}`, baseUrl), {
    headers: { cookie: owner },
  });
  const inviteCode = (await ownerView.text()).match(/data-invite-code>([A-Z0-9]{6})</)?.[1];
  expect(inviteCode).toBeTruthy();

  const hiddenStream = await fetch(new URL(`/api/groups/${groupId}/events`, baseUrl), {
    headers: { cookie: learner },
  });
  expect(hiddenStream.status).toBe(404);

  expect((await post("/api/groups/join", learner, { inviteCode: inviteCode! })).status).toBe(303);

  const stream = await fetch(new URL(`/api/groups/${groupId}/events`, baseUrl), {
    headers: { cookie: learner },
  });
  expect(stream.status).toBe(200);
  expect(stream.headers.get("content-type")).toContain("text/event-stream");

  const liveQuestion = waitForServerEvent(stream, "question.created");
  const startedAt = performance.now();
  const asked = await post(`/api/groups/${groupId}/questions`, owner, {
    title: `Does this arrive live? ${suffix}`,
    body: "The second learner should receive this question without reloading the group page.",
    anonymous: "on",
  });
  expect(asked.status).toBe(303);
  const questionId = idFrom(asked.headers.get("location"), "questions");
  const event = await liveQuestion;

  expect(performance.now() - startedAt).toBeLessThan(1_000);
  expect(event).toMatchObject({ groupId, questionId });

  const answerStream = await fetch(new URL(`/api/groups/${groupId}/events`, baseUrl), {
    headers: { cookie: learner },
  });
  expect(answerStream.status).toBe(200);
  const liveAnswer = waitForServerEvent(answerStream, "answer.created");
  const answerStartedAt = performance.now();
  const answered = await post(`/api/questions/${questionId}/answers`, owner, {
    body: "The question event arrived through a live server stream.",
    anonymous: "on",
  });
  expect(answered.status).toBe(303);
  const answerEvent = await liveAnswer;

  expect(performance.now() - answerStartedAt).toBeLessThan(1_000);
  expect(answerEvent).toMatchObject({ groupId, questionId });
});

it("shares only an anonymous count when several learners are present", async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const owner = await newSession();
  const learner = await newSession();
  expect((await post("/api/profile", owner, { displayName: `Named Owner ${suffix}` })).status).toBe(303);
  expect((await post("/api/profile", learner, { displayName: `Named Learner ${suffix}` })).status).toBe(303);

  const created = await post("/api/groups", owner, {
    name: `Presence Contract ${suffix}`,
    institution: "Test University",
    courseCode: `HERE${suffix}`,
    description: "A private room used to verify anonymous presence between two sessions.",
    visibility: "private",
  });
  const groupId = idFrom(created.headers.get("location"), "groups");
  const ownerView = await fetch(new URL(`/groups/${groupId}`, baseUrl), {
    headers: { cookie: owner },
  });
  const inviteCode = (await ownerView.text()).match(/data-invite-code>([A-Z0-9]{6})</)?.[1];
  expect(inviteCode).toBeTruthy();
  expect((await post("/api/groups/join", learner, { inviteCode: inviteCode! })).status).toBe(303);

  const ownerStream = await fetch(new URL(`/api/groups/${groupId}/events`, baseUrl), {
    headers: { cookie: owner },
  });
  const learnerStream = await fetch(new URL(`/api/groups/${groupId}/events`, baseUrl), {
    headers: { cookie: learner },
  });
  const presence = await waitForServerEvent(learnerStream, "presence.changed");

  expect(presence).toEqual({ groupId, activeLearners: 2 });
  expect(JSON.stringify(presence)).not.toContain(`Named Owner ${suffix}`);
  expect(JSON.stringify(presence)).not.toContain(`Named Learner ${suffix}`);
  await ownerStream.body?.cancel();
});
