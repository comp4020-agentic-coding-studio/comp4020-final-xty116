import type { APIRoute } from "astro";
import { createCourseInvites, getGroup } from "../../../../lib/db";
import { getOrCreateViewer } from "../../../../lib/session";
import { assertSameOrigin, errorResponse, formText, seeOther, ValidationError } from "../../../../lib/http";
import { recordActivity } from "../../../../lib/activity";

export const prerender = false;
export const POST: APIRoute = async ({ params, cookies, request }) => {
  const groupId = Number(params.id);
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    if (!getGroup(groupId, viewer.id)?.isOwner) {
      recordActivity(viewer, { action: "group.invited", result: "denied", groupId });
      return new Response("Only the group organiser can manage invitations.", { status: 403 });
    }
    const form = await request.formData();
    const roster = formText(form, "roster", { min: 2, max: 15000 });
    const labels = [...new Set(roster.split(/[\n,;]+/).map(line => line.trim()).filter(Boolean))];
    if (labels.length > 150 || labels.some(label => label.length > 100)) throw new ValidationError("Invite up to 150 students at once, with one name or email per line (100 characters each).");
    createCourseInvites(groupId, viewer.id, labels);
    recordActivity(viewer, { action: "group.invited", result: "succeeded", groupId });
    return seeOther(`/groups/${groupId}#invitations`, { notice: "Invitations created. Copy individual links or download the invitation list to share with your class." });
  } catch (error) { return errorResponse(error, `/groups/${groupId}#invitations`); }
};
