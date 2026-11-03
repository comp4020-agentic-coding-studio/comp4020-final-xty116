import { expect, inject, it } from "vitest";
const baseUrl = inject("baseUrl");
async function session() {
  return (await fetch(baseUrl)).headers.get("set-cookie")!.split(";", 1)[0];
}
async function post(
  path: string,
  cookie: string,
  fields: Record<string, string>,
) {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie,
      origin: new URL(baseUrl).origin,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields),
  });
}
function id(response: Response) {
  return Number(
    response.headers
      .get("location")
      ?.match(/\/(?:groups|questions)\/(\d+)/)?.[1],
  );
}
it("searches question and answer text without revealing another course's private work", async () => {
  const owner = await session(),
    stranger = await session();
  const suffix = crypto.randomUUID().slice(0, 8);
  const groupId = id(
    await post("/api/groups", owner, {
      name: `Private Search ${suffix}`,
      institution: "ANU",
      courseCode: "COMP1110",
      description: "A course with private questions and peer explanations.",
      visibility: "private",
    }),
  );
  const questionId = id(
    await post(`/api/groups/${groupId}/questions`, owner, {
      title: `Understanding recursion ${suffix}`,
      body: "Why does a recursive program need a stopping condition?",
      anonymous: "on",
    }),
  );
  await post(`/api/questions/${questionId}/answers`, owner, {
    body: `The anchor condition stops further calls. UniqueConcept${suffix}`,
    anonymous: "on",
  });
  const own = await post("/api/search", owner, {
    q: `UniqueConcept${suffix}`,
    mode: "keyword",
  });
  const ownData = await own.json();
  expect(ownData.results).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: questionId })]),
  );
  const denied = await post("/api/search", stranger, {
    q: `UniqueConcept${suffix}`,
    mode: "keyword",
  });
  expect((await denied.json()).results).toEqual([]);
  const deniedScope = await post("/api/search", stranger, {
    q: "recursion",
    mode: "keyword",
    groupId: String(groupId),
  });
  expect((await deniedScope.json()).results).toEqual([]);
  const changes = await Promise.all([
    post(`/api/questions/${questionId}/answers`, owner, {
      body: "A base case terminates the process without another call.",
      anonymous: "on",
    }),
    post(`/api/questions/${questionId}/answers`, owner, {
      body: "Imagine descending stairs until you reach the ground floor.",
      anonymous: "on",
    }),
  ]);
  expect(changes.every((response) => response.status === 303)).toBe(true);
  expect(
    (
      await post(`/api/questions/${questionId}/resolve`, stranger, {
        resolved: "1",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await post(`/api/questions/${questionId}/resolve`, owner, {
        resolved: "1",
      })
    ).status,
  ).toBe(303);
  const revisited = await fetch(new URL(`/questions/${questionId}`, baseUrl), {
    headers: { cookie: owner },
  });
  const html = await revisited.text();
  expect(html).toContain("ground floor");
  expect(html).toContain("base case");
  expect(html).toContain("Understood");
});
