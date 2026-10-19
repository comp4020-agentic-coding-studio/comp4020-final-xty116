import type { APIRoute } from "astro";
import { recordActivity } from "../../../../lib/activity";
import { createAnswer, questionGroupId, type Viewer } from "../../../../lib/db";
import { assertSameOrigin, errorResponse, formText, seeOther, ValidationError } from "../../../../lib/http";
import { publishToGroup } from "../../../../lib/realtime";
import { getOrCreateViewer } from "../../../../lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const questionId = Number(params.id);
  if (!Number.isInteger(questionId)) return new Response("Not found", { status: 404 });
  let viewer: Viewer | undefined;
  try {
    assertSameOrigin(request);
    viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const groupId = createAnswer({
      questionId,
      viewerId: viewer.id,
      body: formText(form, "body", { min: 8, max: 2400 }),
      anonymous: form.get("anonymous") === "on",
    });
    if (!groupId) {
      recordActivity(viewer, {
        action: "answer.created",
        result: "denied",
        groupId: questionGroupId(questionId),
        questionId,
      });
      throw new ValidationError("Join the group before adding an explanation");
    }
    recordActivity(viewer, { action: "answer.created", result: "succeeded", groupId, questionId });
    publishToGroup({ type: "answer.created", groupId, questionId });
    return seeOther(`/questions/${questionId}#answers`, { notice: "Your explanation has been added." });
  } catch (error) {
    return errorResponse(error, `/questions/${questionId}#answer`);
  }
};
