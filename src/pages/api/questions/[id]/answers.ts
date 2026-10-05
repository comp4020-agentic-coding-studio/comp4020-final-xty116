import type { APIRoute } from "astro";
import { createAnswer } from "../../../../lib/db";
import { assertSameOrigin, errorResponse, formText, seeOther, ValidationError } from "../../../../lib/http";
import { getOrCreateViewer } from "../../../../lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, params }) => {
  const questionId = Number(params.id);
  if (!Number.isInteger(questionId)) return new Response("Not found", { status: 404 });
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const created = createAnswer({
      questionId,
      viewerId: viewer.id,
      body: formText(form, "body", { min: 8, max: 2400 }),
      anonymous: form.get("anonymous") === "on",
    });
    if (!created) throw new ValidationError("Join the group before adding an explanation");
    return seeOther(`/questions/${questionId}#answers`, { notice: "Your explanation has been added." });
  } catch (error) {
    return errorResponse(error, `/questions/${questionId}#answer`);
  }
};
