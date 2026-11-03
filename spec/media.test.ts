import { expect, inject, it } from "vitest";

const baseUrl = inject("baseUrl");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWPQjbT/D8IMMAYAOuoHEd0WK4EAAAAASUVORK5CYII=",
  "base64",
);
async function session() {
  const response = await fetch(baseUrl);
  return response.headers.get("set-cookie")!.split(";", 1)[0];
}
async function post(
  path: string,
  cookie: string,
  fields: Record<string, string>,
  image = false,
) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.set(key, value));
  if (image)
    form.set("images", new Blob([png], { type: "image/png" }), "reasoning.png");
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    redirect: "manual",
    headers: { cookie, origin: new URL(baseUrl).origin },
    body: form,
  });
}
function id(response: Response) {
  return Number(
    response.headers
      .get("location")
      ?.match(/\/(?:groups|questions)\/(\d+)/)?.[1],
  );
}

it("persists image and handwritten explanations and protects private attachments", async () => {
  const owner = await session();
  const stranger = await session();
  const suffix = crypto.randomUUID().slice(0, 8);
  const groupId = id(
    await post("/api/groups", owner, {
      name: `Visual reasoning ${suffix}`,
      institution: "ANU",
      courseCode: "MATH1013",
      description: "Compare several ways to explain a mathematical idea.",
      visibility: "private",
    }),
  );
  const asked = await post(
    `/api/groups/${groupId}/questions`,
    owner,
    {
      title: `A diagram question ${suffix}`,
      body: "",
      anonymous: "on",
      attachmentAlt: "A geometric construction",
      drawingData: `data:image/png;base64,${png.toString("base64")}`,
    },
    true,
  );
  const questionId = id(asked);
  expect(questionId).toBeGreaterThan(0);
  const page = await fetch(new URL(`/questions/${questionId}`, baseUrl), {
    headers: { cookie: owner },
  });
  const html = await page.text();
  const attachments = [
    ...html.matchAll(/src="(\/api\/attachments\/[^"]+)"/g),
  ].map((match) => match[1]);
  expect(attachments).toHaveLength(2);
  for (const path of attachments) {
    const allowed = await fetch(new URL(path, baseUrl), {
      headers: { cookie: owner },
    });
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await allowed.arrayBuffer())).toEqual(png);
    expect(
      (await fetch(new URL(path, baseUrl), { headers: { cookie: stranger } }))
        .status,
    ).toBe(404);
  }
  const answer = await post(`/api/questions/${questionId}/answers`, owner, {
    body: "Here is another way to reason about the construction.",
    anonymous: "on",
    drawingData: `data:image/png;base64,${png.toString("base64")}`,
    attachmentAlt: "An alternative handwritten solution",
  });
  expect(answer.status).toBe(303);
  const revisited = await fetch(new URL(`/questions/${questionId}`, baseUrl), {
    headers: { cookie: owner },
  });
  expect(
    (await revisited.text()).match(/src="\/api\/attachments\//g),
  ).toHaveLength(3);
});

it("rejects images whose headers look valid but whose pixels cannot be decoded", async () => {
  const owner = await session();
  const groupId = id(
    await post("/api/groups", owner, {
      name: "Media validation room",
      institution: "ANU",
      courseCode: "MATH1013",
      description:
        "Check that an image is an actual explanation rather than broken bytes.",
      visibility: "private",
    }),
  );
  const truncated = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(truncated);
  truncated.writeUInt32BE(2, 16);
  truncated.writeUInt32BE(2, 20);
  const form = new FormData();
  form.set("title", "This truncated file must be rejected");
  form.set("body", "");
  form.set("attachmentAlt", "A deliberately damaged test diagram");
  form.set(
    "images",
    new Blob([truncated], { type: "image/png" }),
    "broken.png",
  );
  const response = await fetch(
    new URL(`/api/groups/${groupId}/questions`, baseUrl),
    {
      method: "POST",
      redirect: "manual",
      headers: { cookie: owner, origin: new URL(baseUrl).origin },
      body: form,
    },
  );
  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toContain("error=");
  const room = await fetch(new URL(`/groups/${groupId}`, baseUrl), {
    headers: { cookie: owner },
  });
  expect(await room.text()).not.toContain(
    "This truncated file must be rejected",
  );
});
