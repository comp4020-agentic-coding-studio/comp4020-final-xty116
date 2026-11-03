import { subscribeToGroup, type GroupEvent } from "./realtime";

const encoder = new TextEncoder();
export function eventStream(
  groupId: number,
  viewerId: string,
  request: Request,
): Response {
  let close = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const unsubscribe = subscribeToGroup(
        groupId,
        viewerId,
        (event: GroupEvent) => {
          if (!closed)
            controller.enqueue(
              encoder.encode(
                `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
              ),
            );
        },
      );
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 20000);
      close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        request.signal.removeEventListener("abort", close);
      };
      request.signal.addEventListener("abort", close, { once: true });
      controller.enqueue(
        encoder.encode(
          `event: ready\ndata: ${JSON.stringify({ groupId })}\n\n`,
        ),
      );
    },
    cancel() {
      close();
    },
  });
  return new Response(stream, {
    headers: {
      "cache-control": "no-cache, no-transform",
      "content-type": "text/event-stream; charset=utf-8",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
