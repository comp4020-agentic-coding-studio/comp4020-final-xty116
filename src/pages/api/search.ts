import type { APIRoute } from "astro";
import { getOrCreateViewer } from "../../lib/session";
import { assertSameOrigin } from "../../lib/http";
import { keywordSearch, similarQuestions } from "../../lib/search";

export const prerender = false;
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const query = form.get("q"), groupValue = form.get("groupId");
    if (typeof query !== "string" || query.trim().length < 2 || query.length > 500) return Response.json({ error: "Ask in 2 to 500 characters." }, { status: 400 });
    const groupId = typeof groupValue === "string" && /^\d+$/.test(groupValue) ? Number(groupValue) : undefined;
    const result = form.get("mode") === "ai" ? await similarQuestions(viewer.id, query.trim(), groupId) : keywordSearch(viewer.id, query.trim(), groupId);
    return Response.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Search is temporarily unavailable. Try again in a moment." }, { status: 503 });
  }
};
