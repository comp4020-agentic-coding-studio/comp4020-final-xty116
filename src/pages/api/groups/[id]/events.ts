import type { APIRoute } from "astro";
import { getGroup } from "../../../../lib/db";
import { subscribeToGroup, type GroupEvent } from "../../../../lib/realtime";
import { getOrCreateViewer } from "../../../../lib/session";

export const prerender = false;

const encoder = new TextEncoder();

function frame(eventName: string, data: object): Uint8Array {
  return encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const GET: APIRoute = ({ cookies, params, request }) => {
  const groupId = Number(params.id);
  if (!Number.isInteger(groupId)) return new Response("Not found", { status: 404 });

  const viewer = getOrCreateViewer(cookies);
  if (!getGroup(groupId, viewer.id)) return new Response("Not found", { status: 404 });

  let close = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: GroupEvent) => {
        if (!closed) controller.enqueue(frame(event.type, event));
      };
      const unsubscribe = subscribeToGroup(groupId, viewer.id, send);
      const keepAlive = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 20_000);

      close = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        unsubscribe();
      };

      request.signal.addEventListener("abort", close, { once: true });
      controller.enqueue(frame("ready", { groupId }));
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
    },
  });
};
