import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");
async function session() { return (await fetch(baseUrl)).headers.get("set-cookie")!.split(";", 1)[0]; }
async function post(path: string, cookie: string, fields: Record<string, string>) {
  return fetch(new URL(path, baseUrl), { method: "POST", redirect: "manual", headers: {
    cookie, origin: new URL(baseUrl).origin, "content-type": "application/x-www-form-urlencoded",
  }, body: new URLSearchParams(fields) });
}
it("lets a course organiser invite a whole class without exposing the roster to learners", async () => {
  const teacher = await session(), learner = await session(), stranger = await session();
  const suffix = crypto.randomUUID().slice(0, 8);
  const created = await post("/api/groups", teacher, {
    name: `Tutorial ${suffix}`, institution: "ANU", courseCode: "COMP4020", kind: "course",
    description: "A private course with many invited learners.", visibility: "private",
  });
  const groupId = Number(created.headers.get("location")?.match(/\/groups\/(\d+)/)?.[1]);
  const invited = await post(`/api/groups/${groupId}/invites`, teacher, { roster: `alex-${suffix}@example.test\nsam-${suffix}@example.test` });
  expect(invited.status).toBe(303);
  const page = await fetch(new URL(`/groups/${groupId}`, baseUrl), { headers: { cookie: teacher } });
  const html = await page.text();
  const token = html.match(/\/invite\/([a-f0-9]{48})/)?.[1];
  expect(token).toBeTruthy();
  const join = await post("/api/invitations/accept", learner, { token: token! });
  expect(join.headers.get("location")).toContain(`/groups/${groupId}`);
  const learnerPage = await fetch(new URL(`/groups/${groupId}`, baseUrl), { headers: { cookie: learner } });
  const learnerHtml = await learnerPage.text();
  expect(learnerHtml).toContain(`Tutorial ${suffix}`);
  expect(learnerHtml).not.toContain(`alex-${suffix}@example.test`);
  expect(learnerHtml).not.toContain(`sam-${suffix}@example.test`);
  expect((await post(`/api/groups/${groupId}/invites`, learner, { roster: "not-allowed@example.test" })).status).toBe(403);
  const stolen = await post("/api/invitations/accept", stranger, { token: token! });
  expect(stolen.headers.get("location")).not.toContain(`/groups/${groupId}`);
  expect((await fetch(new URL(`/groups/${groupId}`, baseUrl), { headers: { cookie: stranger } })).status).toBe(404);
});
