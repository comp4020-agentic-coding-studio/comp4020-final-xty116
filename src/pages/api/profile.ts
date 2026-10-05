import type { APIRoute } from "astro";
import { updateViewer } from "../../lib/db";
import { assertSameOrigin, errorResponse, formText, seeOther } from "../../lib/http";
import { getOrCreateViewer } from "../../lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const displayName = formText(form, "displayName", { min: 2, max: 40 });
    updateViewer(viewer.id, displayName);
    return seeOther("/", { notice: "Your study identity has been updated." });
  } catch (error) {
    return errorResponse(error, "/");
  }
};
