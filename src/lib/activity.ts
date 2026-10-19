import { createHash } from "node:crypto";
import type { Viewer } from "./db";

export type ActivityAction =
  | "profile.updated"
  | "group.created"
  | "group.joined"
  | "question.created"
  | "answer.created";

export type ActivityResult = "succeeded" | "denied" | "rejected";

export interface ActivityDetails {
  action: ActivityAction;
  result: ActivityResult;
  groupId?: number;
  questionId?: number;
}

function actorId(viewerId: string): string {
  return createHash("sha256").update(viewerId).digest("hex").slice(0, 12);
}

export function recordActivity(viewer: Viewer, details: ActivityDetails): void {
  console.info(
    JSON.stringify({
      event: "studynow.activity",
      occurredAt: new Date().toISOString(),
      actorId: actorId(viewer.id),
      actorLabel: viewer.anonLabel,
      ...details,
    }),
  );
}
