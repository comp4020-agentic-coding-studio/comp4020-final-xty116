import type { APIRoute } from "astro";
import { getOrCreateViewer } from "../../lib/session";
import { eventStream } from "../../lib/event-stream";
export const prerender = false;
export const GET: APIRoute = ({ cookies, request }) => eventStream(0, getOrCreateViewer(cookies).id, request);
