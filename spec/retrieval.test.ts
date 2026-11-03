import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { availablePort, startApp, stopApp } from "./support/app";

it("uses a model response, rejects invented or inaccessible citations and survives a process restart", async () => {
  let captured = "",
    failUpstream = false,
    publicId = 0,
    privateId = 0;
  const upstream = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    captured = body;
    if (failUpstream) {
      response.writeHead(503).end();
      return;
    }
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              matches: [
                {
                  id: publicId,
                  reason:
                    "Both ask how a stopping condition prevents endless recursion.",
                },
                { id: privateId, reason: "Must be filtered out." },
                { id: 99999999, reason: "Invented." },
              ],
            }),
          },
        ],
      }),
    );
  }).listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const address = upstream.address();
  if (!address || typeof address === "string")
    throw new Error("No upstream port");
  const directory = await mkdtemp(join(tmpdir(), "studynow-retrieval-")),
    port = await availablePort(),
    base = `http://127.0.0.1:${port}`;
  const environment = {
    AI_API_KEY: "local-contract-placeholder",
    AI_BASE_URL: `http://127.0.0.1:${address.port}`,
    AI_MODEL: "contract-model",
  };
  let app = await startApp(port, join(directory, "app.db"), environment);
  const post = (path: string, cookie: string, fields: Record<string, string>) =>
    fetch(base + path, {
      method: "POST",
      redirect: "manual",
      headers: {
        cookie,
        origin: base,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(fields),
    });
  const id = (r: Response) =>
    Number(
      r.headers.get("location")?.match(/\/(?:groups|questions)\/(\d+)/)?.[1],
    );
  try {
    const owner = (await fetch(base)).headers
      .get("set-cookie")!
      .split(";", 1)[0];
    const stranger = (await fetch(base)).headers
      .get("set-cookie")!
      .split(";", 1)[0];
    const groupFields = {
      name: "Recursion study room",
      institution: "ANU",
      courseCode: "COMP1110",
      description:
        "Reasoning about recursive programs through different explanations.",
    };
    const groupId = id(
      await post("/api/groups", owner, {
        ...groupFields,
        visibility: "public",
      }),
    );
    publicId = id(
      await post(`/api/groups/${groupId}/questions`, owner, {
        title: "Why does recursion need a base case?",
        body: "Without a stopping rule, calls repeat indefinitely.",
        anonymous: "on",
      }),
    );
    const privateGroup = id(
      await post("/api/groups", owner, {
        ...groupFields,
        name: "Confidential tutorial",
        visibility: "private",
      }),
    );
    privateId = id(
      await post(`/api/groups/${privateGroup}/questions`, owner, {
        title: "SecretCourseQuestionSentinel",
        body: "Private reasoning must never be sent for a non-member.",
        anonymous: "on",
      }),
    );
    const result = await (
      await post("/api/search", stranger, {
        q: "When do self-calling functions stop?",
        mode: "ai",
      })
    ).json();
    expect(result.mode).toBe("ai");
    expect(result.results).toHaveLength(1);
    expect(result.results[0].id).toBe(publicId);
    expect(captured).not.toContain("SecretCourseQuestionSentinel");
    expect(captured).toContain("stopping rule");
    failUpstream = true;
    const fallback = await (
      await post("/api/search", stranger, { q: "recursion", mode: "ai" })
    ).json();
    expect(fallback.mode).toBe("keyword");
    expect(fallback.message).toContain("could not connect");
    expect(
      fallback.results.some((r: { id: number }) => r.id === publicId),
    ).toBe(true);
    await stopApp(app);
    app = await startApp(port, join(directory, "app.db"), environment);
    const persisted = await fetch(`${base}/questions/${privateId}`, {
      headers: { cookie: owner },
    });
    expect(persisted.status).toBe(200);
    expect(await persisted.text()).toContain("SecretCourseQuestionSentinel");
    expect(
      (
        await fetch(`${base}/questions/${privateId}`, {
          headers: { cookie: stranger },
        })
      ).status,
    ).toBe(404);
  } finally {
    await stopApp(app);
    upstream.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 20000);
