import type { APIRoute } from "astro";
import { getGroup } from "../../../../lib/db";
import { eventStream } from "../../../../lib/event-stream";
import { getOrCreateViewer } from "../../../../lib/session";
export const prerender = false;
export const GET: APIRoute = ({ cookies, params, request }) => {
  const groupId = Number(params.id);
  if (!Number.isInteger(groupId))
    return new Response("Not found", { status: 404 });
  const viewer = getOrCreateViewer(cookies);
  if (!getGroup(groupId, viewer.id))
    return new Response("Not found", { status: 404 });
  return eventStream(groupId, viewer.id, request);
};
