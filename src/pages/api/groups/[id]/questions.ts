import type { APIRoute } from "astro";
import { createQuestion } from "../../../../lib/db";
import { assertSameOrigin, errorResponse, formText, seeOther, ValidationError } from "../../../../lib/http";
import { getOrCreateViewer } from "../../../../lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const groupId = Number(params.id);
  if (!Number.isInteger(groupId)) return new Response("Not found", { status: 404 });
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const questionId = createQuestion({
      groupId,
      viewerId: viewer.id,
      title: formText(form, "title", { min: 6, max: 140 }),
      body: formText(form, "body", { min: 12, max: 1600 }),
      anonymous: form.get("anonymous") === "on",
    });
    if (!questionId) throw new ValidationError("Join this group before asking a question");
    return seeOther(`/questions/${questionId}`, { notice: "Your question is open for more than one explanation." });
  } catch (error) {
    return errorResponse(error, `/groups/${groupId}#ask`);
  }
};
