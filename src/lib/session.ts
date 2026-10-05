import { randomBytes, randomUUID } from "node:crypto";
import type { AstroCookies } from "astro";
import { createViewer, getViewer, type Viewer } from "./db";

const COOKIE_NAME = "studynow_session";
const adjectives = ["Amber", "Bright", "Calm", "Curious", "Indigo", "Quiet", "Silver", "Warm"];
const nouns = ["Atlas", "Cedar", "Comet", "Fern", "Harbour", "Juniper", "Lantern", "Willow"];

function anonymousLabel(): string {
  const bytes = randomBytes(2);
  return `Anonymous ${adjectives[bytes[0] % adjectives.length]} ${nouns[bytes[1] % nouns.length]}`;
}

export function getOrCreateViewer(cookies: AstroCookies): Viewer {
  const existingId = cookies.get(COOKIE_NAME)?.value;
  if (existingId) {
    const existing = getViewer(existingId);
    if (existing) return existing;
  }

  const viewer = createViewer({
    id: randomUUID(),
    displayName: "New learner",
    anonLabel: anonymousLabel(),
  });
  cookies.set(COOKIE_NAME, viewer.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 365,
  });
  return viewer;
}
