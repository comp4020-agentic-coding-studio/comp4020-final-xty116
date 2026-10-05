import { randomBytes } from "node:crypto";
import type { APIRoute } from "astro";
import { createGroup } from "../../../lib/db";
import { assertSameOrigin, errorResponse, formText, seeOther, ValidationError } from "../../../lib/http";
import { getOrCreateViewer } from "../../../lib/session";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    assertSameOrigin(request);
    const viewer = getOrCreateViewer(cookies);
    const form = await request.formData();
    const visibilityValue = form.get("visibility");
    if (visibilityValue !== "public" && visibilityValue !== "private") {
      throw new ValidationError("Choose whether this group is public or invite-only");
    }

    const groupId = createGroup({
      viewerId: viewer.id,
      name: formText(form, "name", { min: 3, max: 70 }),
      institution: formText(form, "institution", { min: 2, max: 80 }),
      courseCode: formText(form, "courseCode", { min: 2, max: 30 }).toUpperCase(),
      description: formText(form, "description", { min: 12, max: 280 }),
      visibility: visibilityValue,
      inviteCode: randomBytes(4).toString("hex").slice(0, 6).toUpperCase(),
    });
    return seeOther(`/groups/${groupId}`, { notice: "Study group created. Share the invite code when you are ready." });
  } catch (error) {
    return errorResponse(error, "/#create-group");
  }
};
