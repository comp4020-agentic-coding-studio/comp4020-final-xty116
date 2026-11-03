import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";

interface ActivityEvent {
  event: "studynow.activity";
  actorId: string;
  actorLabel: string;
  action: string;
  result: string;
  groupId?: number;
  questionId?: number;
}

let app: ChildProcessWithoutNullStreams;
let appUrl: string;
let output = "";
let dataDirectory: string;

async function availablePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a test port");
  server.close();
  await once(server, "close");
  return address.port;
}

async function waitUntilReady(url: string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Instrumented app did not start. Output:\n${output}`);
}

function cookieFrom(response: Response): string {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  if (!cookie) throw new Error("StudyNow did not issue a session cookie");
  return cookie;
}

async function newSession(): Promise<string> {
  return cookieFrom(await fetch(appUrl, { redirect: "manual" }));
}

async function post(path: string, cookie: string, fields: Record<string, string>): Promise<Response> {
  return fetch(new URL(path, appUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie,
      origin: new URL(appUrl).origin,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
  });
}

function idFrom(response: Response, kind: "groups" | "questions"): number {
  const match = response.headers.get("location")?.match(new RegExp(`/${kind}/(\\d+)`));
  if (!match) throw new Error(`No ${kind} id in redirect`);
  return Number(match[1]);
}

async function activityEvents(expectedCount: number): Promise<ActivityEvent[]> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const events = output
      .split("\n")
      .flatMap((line) => {
        try {
          const event = JSON.parse(line) as ActivityEvent;
          return event.event === "studynow.activity" ? [event] : [];
        } catch {
          return [];
        }
      });
    if (events.length >= expectedCount) return events;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return [];
}

beforeAll(async () => {
  dataDirectory = await mkdtemp(join(tmpdir(), "studynow-activity-"));
  const port = await availablePort();
  appUrl = `http://127.0.0.1:${port}`;
  app = spawn(process.execPath, ["dist/server/entry.mjs"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DATABASE_PATH: join(dataDirectory, "studynow.db"),
    },
  });
  app.stdout.setEncoding("utf8");
  app.stderr.setEncoding("utf8");
  app.stdout.on("data", (chunk: string) => {
    output += chunk;
  });
  app.stderr.on("data", (chunk: string) => {
    output += chunk;
  });
  await waitUntilReady(appUrl);
});

afterAll(async () => {
  app.kill("SIGTERM");
  await Promise.race([once(app, "exit"), new Promise((resolve) => setTimeout(resolve, 1_000))]);
  await rm(dataDirectory, { recursive: true, force: true });
});

it("tells two browser sessions apart in server activity logs without leaking their work", async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const owner = await newSession();
  const learner = await newSession();

  const created = await post("/api/groups", owner, {
    name: `Instrument Contract ${suffix}`,
    institution: "Test University",
    courseCode: `LOG${suffix}`,
    description: "A room used to verify the production activity log contract.",
    visibility: "public",
  });
  expect(created.status).toBe(303);
  const groupId = idFrom(created, "groups");

  expect((await post("/api/groups/join", learner, { groupId: String(groupId) })).status).toBe(303);

  const questionBody = `Sensitive question body ${suffix}`;
  const asked = await post(`/api/groups/${groupId}/questions`, owner, {
    title: `Can the logs tell us apart? ${suffix}`,
    body: questionBody,
    anonymous: "on",
  });
  expect(asked.status).toBe(303);
  const questionId = idFrom(asked, "questions");

  const answerBody = `Sensitive answer body ${suffix}`;
  expect(
    (
      await post(`/api/questions/${questionId}/answers`, learner, {
        body: answerBody,
        anonymous: "on",
      })
    ).status,
  ).toBe(303);

  const events = await activityEvents(4);
  const groupCreated = events.find((event) => event.action === "group.created" && event.groupId === groupId);
  const groupJoined = events.find((event) => event.action === "group.joined" && event.groupId === groupId);
  const questionCreated = events.find(
    (event) => event.action === "question.created" && event.questionId === questionId,
  );
  const answerCreated = events.find(
    (event) => event.action === "answer.created" && event.questionId === questionId,
  );

  expect(groupCreated).toMatchObject({ result: "succeeded" });
  expect(groupJoined).toMatchObject({ result: "succeeded" });
  expect(questionCreated).toMatchObject({ result: "succeeded", groupId });
  expect(answerCreated).toMatchObject({ result: "succeeded", groupId });
  expect(groupCreated?.actorId).toBe(questionCreated?.actorId);
  expect(groupJoined?.actorId).toBe(answerCreated?.actorId);
  expect(groupCreated?.actorId).not.toBe(groupJoined?.actorId);
  expect(groupCreated?.actorLabel).toMatch(/^Anonymous /);
  expect(groupJoined?.actorLabel).toMatch(/^Anonymous /);

  expect(output).not.toContain(owner.split("=", 2)[1]);
  expect(output).not.toContain(learner.split("=", 2)[1]);
  expect(output).not.toContain(questionBody);
  expect(output).not.toContain(answerBody);
});

it("records a server-side permission denial without storing the rejected content", async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const owner = await newSession();
  const stranger = await newSession();
  const eventsBefore = (await activityEvents(4)).length;

  const created = await post("/api/groups", owner, {
    name: `Private Instrument ${suffix}`,
    institution: "Test University",
    courseCode: `LOCK${suffix}`,
    description: "A private room used to verify that denied writes are visible in the logs.",
    visibility: "private",
  });
  const groupId = idFrom(created, "groups");
  const rejectedBody = `This rejected draft must never enter the logs ${suffix}`;

  const rejected = await post(`/api/groups/${groupId}/questions`, stranger, {
    title: `A stranger should not post ${suffix}`,
    body: rejectedBody,
    anonymous: "on",
  });
  expect(rejected.status).toBe(303);
  expect(rejected.headers.get("location")).toContain("Join+this+group");

  const events = await activityEvents(eventsBefore + 2);
  const denied = events.find(
    (event) =>
      event.action === "question.created" && event.result === "denied" && event.groupId === groupId,
  );
  expect(denied?.actorId).toMatch(/^[a-f0-9]{12}$/);
  expect(denied?.actorLabel).toMatch(/^Anonymous /);

  const groupPage = await fetch(new URL(`/groups/${groupId}`, appUrl), { headers: { cookie: owner } });
  expect(groupPage.status).toBe(200);
  expect(await groupPage.text()).not.toContain(`A stranger should not post ${suffix}`);
  expect(output).not.toContain(rejectedBody);
  expect(output).not.toContain(stranger.split("=", 2)[1]);
});

it("accounts for identity changes, invalid invitations and rejected answers", async () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const owner = await newSession();
  const stranger = await newSession();
  const eventsBefore = (await activityEvents(6)).length;
  const displayName = `Instrument Learner ${suffix}`;

  expect((await post("/api/profile", stranger, { displayName })).status).toBe(303);

  const created = await post("/api/groups", owner, {
    name: `Answer Instrument ${suffix}`,
    institution: "Test University",
    courseCode: `ANS${suffix}`,
    description: "A private room used to verify the remaining activity log outcomes.",
    visibility: "private",
  });
  const groupId = idFrom(created, "groups");
  const asked = await post(`/api/groups/${groupId}/questions`, owner, {
    title: `Who may answer this question? ${suffix}`,
    body: "Only members of this private group should be able to add an explanation.",
    anonymous: "on",
  });
  const questionId = idFrom(asked, "questions");
  const rejectedAnswer = `A non-member answer that must remain private ${suffix}`;

  const answerResponse = await post(`/api/questions/${questionId}/answers`, stranger, {
    body: rejectedAnswer,
    anonymous: "on",
  });
  expect(answerResponse.status).toBe(303);
  expect(answerResponse.headers.get("location")).toContain("Join+the+group");

  const invalidInvite = `NO${suffix.slice(0, 4)}`.toUpperCase();
  const joinResponse = await post("/api/groups/join", stranger, { inviteCode: invalidInvite });
  expect(joinResponse.status).toBe(303);
  expect(joinResponse.headers.get("location")).toContain("does+not+match");

  const events = await activityEvents(eventsBefore + 5);
  const profileUpdated = events.find(
    (event) => event.action === "profile.updated" && event.result === "succeeded",
  );
  const answerDenied = events.find(
    (event) =>
      event.action === "answer.created" &&
      event.result === "denied" &&
      event.questionId === questionId,
  );
  const joinRejected = events.find(
    (event) => event.action === "group.joined" && event.result === "rejected",
  );

  expect(profileUpdated?.actorId).toMatch(/^[a-f0-9]{12}$/);
  expect(answerDenied).toMatchObject({ actorId: profileUpdated?.actorId, groupId });
  expect(joinRejected).toMatchObject({ actorId: profileUpdated?.actorId });
  expect(output).not.toContain(displayName);
  expect(output).not.toContain(rejectedAnswer);
  expect(output).not.toContain(invalidInvite);
});

it("records denied status changes using the same operational identity as other actions", async () => {
  const owner = await newSession(), stranger = await newSession();
  const before = (await activityEvents(11)).length;
  const created = await post("/api/groups", owner, { name: "Status activity contract", institution: "ANU", courseCode: "TEST1000", description: "Record who attempted to change another learner's question.", visibility: "private" });
  const groupId = idFrom(created, "groups");
  const asked = await post(`/api/groups/${groupId}/questions`, owner, { title: "Who can mark this question understood?", body: "Only its author or the room organiser can change the status.", anonymous: "on" });
  const questionId = idFrom(asked, "questions");
  const denied = await post(`/api/questions/${questionId}/resolve`, stranger, { resolved: "1" });
  expect(denied.status).toBe(403);
  const events = await activityEvents(before + 3);
  expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ action: "question.resolved", result: "denied", groupId, questionId })]));
  expect(output).not.toContain(stranger.split("=", 2)[1]);
});
