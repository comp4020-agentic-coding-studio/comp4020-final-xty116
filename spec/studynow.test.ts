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
