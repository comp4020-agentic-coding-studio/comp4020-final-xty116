import type { APIRoute } from "astro";
import { recordActivity } from "../../../../lib/activity";
import { createQuestion, type Viewer } from "../../../../lib/db";
import { assertSameOrigin, errorResponse, formText, seeOther, ValidationError } from "../../../../lib/http";
import { publishToGroup } from "../../../../lib/realtime";
import { getOrCreateViewer } from "../../../../lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const groupId = Number(params.id);
  if (!Number.isInteger(groupId)) return new Response("Not found", { status: 404 });
  let viewer: Viewer | undefined;
  try {
    assertSameOrigin(request);
    viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const questionId = createQuestion({
      groupId,
      viewerId: viewer.id,
      title: formText(form, "title", { min: 6, max: 140 }),
      body: formText(form, "body", { min: 12, max: 1600 }),
      anonymous: form.get("anonymous") === "on",
    });
    if (!questionId) {
      recordActivity(viewer, { action: "question.created", result: "denied", groupId });
      throw new ValidationError("Join this group before asking a question");
    }
    recordActivity(viewer, { action: "question.created", result: "succeeded", groupId, questionId });
    publishToGroup({ type: "question.created", groupId, questionId });
    return seeOther(`/questions/${questionId}`, { notice: "Your question is open for more than one explanation." });
  } catch (error) {
    return errorResponse(error, `/groups/${groupId}#ask`);
  }
};
