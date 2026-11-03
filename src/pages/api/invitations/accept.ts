import type { APIRoute } from "astro";
import { acceptCourseInvite } from "../../../lib/db";
import { getOrCreateViewer } from "../../../lib/session";
import { assertSameOrigin, errorResponse, formText, seeOther, ValidationError } from "../../../lib/http";
import { recordActivity } from "../../../lib/activity";
import { publishToGroup } from "../../../lib/realtime";

export const prerender = false;
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const token = formText(form, "token", { min: 48, max: 48 });
    const groupId = acceptCourseInvite(token, viewer.id);
    if (!groupId) throw new ValidationError("This invitation is unavailable or has already been accepted in another browser profile.");
    recordActivity(viewer, { action: "group.joined", result: "succeeded", groupId });
    publishToGroup({ type: "group.changed", groupId });
    return seeOther(`/groups/${groupId}`, { notice: "Welcome to the course. Your browser is now a member." });
  } catch (error) { return errorResponse(error, "/#join-group"); }
};
