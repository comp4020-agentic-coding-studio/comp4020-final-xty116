// @vitest-environment jsdom
import { expect, it, vi } from "vitest";

it("drains a peer update after an overlapping search without sending an unfinished query", async () => {
  document.body.innerHTML = `<form data-knowledge-search><input name="q" value="first query"><input name="mode" value="keyword"><button type="submit">Search</button></form><div data-search-results></div><p data-search-status><span></span></p><div data-search-loading hidden></div>`;
  const requests: { query: string; resolve: (response: Response) => void }[] = [];
  vi.stubGlobal("fetch", vi.fn((_url: string, options: RequestInit) => new Promise<Response>(resolve => {
    requests.push({ query: String((options.body as FormData).get("q")), resolve });
  })));
  const result = (answerCount: number) => Response.json({ mode: "keyword", message: "Matching questions", results: [{ id: 10, title: "A question about limits", body: "Reason about changing slopes.", groupName: "Calculus", courseCode: "MATH1013", answerCount }] });
  try {
    await import("../src/lib/search-client");
    document.dispatchEvent(new Event("studynow:commons"));
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    const input = document.querySelector<HTMLInputElement>("[name=q]")!;
    input.value = "second query";
    document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    document.dispatchEvent(new Event("studynow:commons"));
    requests[1].resolve(result(0));
    await vi.waitFor(() => expect(document.querySelector("[data-result-count]")?.textContent).toBe("0 explanations"));
    input.value = "a third unfinished query";
    requests[0].resolve(result(0));
    await vi.waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2].query).toBe("second query");
    requests[2].resolve(result(1));
    await vi.waitFor(() => expect(document.querySelector("[data-result-count]")?.textContent).toBe("1 explanations"));
    expect(input.value).toBe("a third unfinished query");
  } finally { vi.unstubAllGlobals(); }
});
