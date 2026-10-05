import type { APIRoute } from "astro";
import { joinGroup, joinPublicGroup } from "../../../lib/db";
import { assertSameOrigin, errorResponse, formText, seeOther, ValidationError } from "../../../lib/http";
import { getOrCreateViewer } from "../../../lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const groupIdValue = form.get("groupId");

    if (typeof groupIdValue === "string" && /^\d+$/.test(groupIdValue)) {
      const groupId = Number(groupIdValue);
      if (!joinPublicGroup(viewer.id, groupId)) throw new ValidationError("That public group is not available");
      return seeOther(`/groups/${groupId}`, { notice: "You joined the group and can now ask or answer." });
    }

    const inviteCode = formText(form, "inviteCode", { min: 6, max: 6 }).toUpperCase();
    const groupId = joinGroup(viewer.id, inviteCode);
    if (!groupId) throw new ValidationError("That invite code does not match a study group");
    return seeOther(`/groups/${groupId}`, { notice: "Invite accepted. You are now a member." });
  } catch (error) {
    return errorResponse(error, "/#join-group");
  }
};
