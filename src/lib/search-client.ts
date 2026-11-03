import type { SearchResponse } from "./search";

const form = document.querySelector<HTMLFormElement>(
  "[data-knowledge-search]",
)!;
const query = form.querySelector<HTMLInputElement>("[name=q]")!;
const results = document.querySelector<HTMLElement>("[data-search-results]")!;
const status = document.querySelector<HTMLElement>(
  "[data-search-status] span",
)!;
const loading = document.querySelector<HTMLElement>("[data-search-loading]")!;
const button = form.querySelector<HTMLButtonElement>("[type=submit]")!;
let activeQuery = query.value;
let activeMode: "keyword" | "ai" = "keyword";
let revision = 0,
  pending = false,
  refreshing = false,
  refreshQueued = false;

async function search(fields: FormData): Promise<SearchResponse> {
  const response = await fetch("/api/search", { method: "POST", body: fields });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error ?? "Search is unavailable. Try again shortly.");
  return data;
}
function render(data: SearchResponse): void {
  results.replaceChildren();
  for (const item of data.results) {
    const link = document.createElement("a"),
      meta = document.createElement("div"),
      count = document.createElement("span"),
      source = document.createElement("span"),
      heading = document.createElement("h2"),
      body = document.createElement("p");
    link.className = "search-result";
    link.href = `/questions/${item.id}`;
    link.dataset.resultId = String(item.id);
    meta.className = "result-meta";
    source.textContent = `${item.courseCode} · ${item.groupName}`;
    count.dataset.resultCount = "";
    count.textContent = `${item.answerCount} explanations`;
    meta.append(source, count);
    heading.textContent = item.title;
    body.textContent =
      item.body.length > 260 ? item.body.slice(0, 260) + "..." : item.body;
    link.append(meta, heading, body);
    if (item.reason) {
      const reason = document.createElement("div");
      reason.className = "match-reason";
      reason.textContent = `Related idea: ${item.reason}`;
      link.append(reason);
    }
    results.append(link);
  }
}
async function refresh(): Promise<void> {
  refreshQueued = true;
  if (refreshing || pending || activeQuery.trim().length < 2) return;
  refreshing = true;
  const version = revision;
  try {
    while (refreshQueued && !pending && version === revision) {
      refreshQueued = false;
      const fields = new FormData();
      fields.set("q", activeQuery);
      const group =
        form.querySelector<HTMLInputElement>("[name=groupId]")?.value;
      if (group) fields.set("groupId", group);
      if (activeMode === "ai") {
        fields.set("mode", "refresh");
        fields.set(
          "ids",
          [...results.querySelectorAll<HTMLElement>("[data-result-id]")]
            .map((item) => item.dataset.resultId)
            .join(","),
        );
        const data = await search(fields);
        if (version !== revision) break;
        const current = new Map(data.results.map((item) => [item.id, item]));
        results
          .querySelectorAll<HTMLElement>("[data-result-id]")
          .forEach((card) => {
            const item = current.get(Number(card.dataset.resultId));
            if (!item) card.remove();
            else {
              const count = card.querySelector("[data-result-count]");
              if (count) count.textContent = `${item.answerCount} explanations`;
            }
          });
      } else {
        fields.set("mode", "keyword");
        const data = await search(fields);
        if (version !== revision) break;
        render(data);
      }
    }
  } catch {
    status.textContent =
      "Live search update delayed. Your query is safe; reconnecting will restore the latest counts.";
    window.setTimeout(() => {
      void refresh();
    }, 1500);
  } finally {
    refreshing = false;
  }
}
document.addEventListener("studynow:commons", () => {
  void refresh();
});
document
  .querySelectorAll<HTMLButtonElement>("[data-search-suggestion]")
  .forEach((suggestion) =>
    suggestion.addEventListener("click", () => {
      query.value = suggestion.dataset.searchSuggestion!;
      form.requestSubmit();
    }),
  );
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  pending = true;
  revision += 1;
  loading.hidden = false;
  button.disabled = true;
  results.hidden = true;
  const fields = new FormData(form),
    submittedQuery = query.value;
  try {
    const data = await search(fields);
    activeQuery = submittedQuery;
    activeMode = data.mode;
    status.textContent = `${data.mode === "ai" ? "AI matched · " : "Keyword · "}${data.message}`;
    render(data);
    const url = new URL(window.location.href);
    url.searchParams.set("q", submittedQuery);
    history.replaceState({}, "", url);
    document.querySelector(".search-suggestions")?.remove();
  } catch (error) {
    status.textContent =
      error instanceof Error
        ? error.message
        : "Search interrupted. Your query is still here.";
  } finally {
    pending = false;
    loading.hidden = true;
    button.disabled = false;
    results.hidden = false;
    void refresh();
  }
});
