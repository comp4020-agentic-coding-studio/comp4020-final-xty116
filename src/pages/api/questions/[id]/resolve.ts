import type { APIRoute } from "astro";
import { setResolved } from "../../../../lib/db";
import { getOrCreateViewer } from "../../../../lib/session";
import { assertSameOrigin, errorResponse, seeOther } from "../../../../lib/http";
import { publishToGroup } from "../../../../lib/realtime";
import { recordActivity } from "../../../../lib/activity";

export const prerender = false;
export const POST: APIRoute = async ({ params, cookies, request }) => {
  const questionId = Number(params.id);
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const groupId = setResolved(questionId, viewer.id, form.get("resolved") === "1");
    if (!groupId) return new Response("Only the question author or organiser can change its status.", { status: 403 });
    recordActivity(viewer, { action: "question.resolved", result: "succeeded", groupId, questionId });
    publishToGroup({ type: "question.updated", groupId, questionId });
    return seeOther(`/questions/${questionId}`, { notice: form.get("resolved") === "1" ? "Marked as understood. New explanations are still welcome." : "Question reopened." });
  } catch (error) { return errorResponse(error, `/questions/${questionId}`); }
};
