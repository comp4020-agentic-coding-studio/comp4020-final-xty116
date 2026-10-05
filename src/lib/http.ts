export class ValidationError extends Error {}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    throw new Response("Cross-origin writes are not allowed", { status: 403 });
  }
}

export function formText(
  form: FormData,
  name: string,
  options: { min?: number; max: number },
): string {
  const value = form.get(name);
  if (typeof value !== "string") throw new ValidationError(`${name} is required`);
  const text = value.trim();
  const min = options.min ?? 1;
  if (text.length < min || text.length > options.max) {
    throw new ValidationError(`${name} must be between ${min} and ${options.max} characters`);
  }
  return text;
}

export function seeOther(path: string, params?: Record<string, string>): Response {
  const url = new URL(path, "http://studynow.local");
  for (const [key, value] of Object.entries(params ?? {})) url.searchParams.set(key, value);
  return new Response(null, {
    status: 303,
    headers: { location: `${url.pathname}${url.search}${url.hash}` },
  });
}

export function errorResponse(error: unknown, fallbackPath: string): Response {
  if (error instanceof Response) return error;
  const message = error instanceof ValidationError ? error.message : "Something went wrong. Please try again.";
  return seeOther(fallbackPath, { error: message });
}
