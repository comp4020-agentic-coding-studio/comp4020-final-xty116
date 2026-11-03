import type { APIRoute } from "astro";
import { getAttachment } from "../../../lib/db";
import { getOrCreateViewer } from "../../../lib/session";

export const prerender = false;
export const GET: APIRoute = ({ params, cookies }) => {
  const viewer = getOrCreateViewer(cookies);
  const attachment = getAttachment(params.id ?? "", viewer.id);
  if (!attachment) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(attachment.data), { headers: {
    "content-type": attachment.mime,
    "content-length": String(attachment.data.length),
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
  } });
};
