import type { AttachmentInput } from "./db";
import { ValidationError } from "./http";
import sharp from "sharp";

sharp.cache({ memory: 8, files: 0, items: 10 });
sharp.concurrency(1);

const MAX_IMAGE = 2 * 1024 * 1024;
const MAX_REQUEST = 8 * 1024 * 1024;
let decodeQueue: Promise<void> = Promise.resolve();

export async function contributionForm(request: Request): Promise<FormData> {
  if (Number(request.headers.get("content-length")) > MAX_REQUEST)
    throw new ValidationError("Keep the total upload below 8 MB.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (!reader) throw new ValidationError("Your contribution is empty.");
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_REQUEST) {
      await reader.cancel();
      throw new ValidationError("Keep the total upload below 8 MB.");
    }
    chunks.push(value);
  }
  return new Response(Buffer.concat(chunks), {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData();
}

function imageMime(data: Buffer): string | undefined {
  if (
    data.length >= 24 &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    const width = data.readUInt32BE(16),
      height = data.readUInt32BE(20);
    if (width > 0 && height > 0 && width * height <= 24_000_000)
      return "image/png";
  }
  if (
    data.length >= 12 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  )
    return "image/jpeg";
  if (
    data.length >= 16 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return undefined;
}

async function validateImage(data: Buffer): Promise<void> {
  const validation = decodeQueue.then(async () => {
    try {
      await sharp(data, { limitInputPixels: 24_000_000, failOn: "warning" })
        .resize(1, 1)
        .raw()
        .toBuffer();
    } catch {
      throw new ValidationError(
        "This image is damaged, incomplete or larger than 24 megapixels. Choose another PNG, JPEG or WebP image.",
      );
    }
  });
  decodeQueue = validation.catch(() => {});
  await validation;
}

export async function contributionContent(
  form: FormData,
  maxText: number,
): Promise<{ body: string; attachments: AttachmentInput[] }> {
  const rawBody = form.get("body");
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (body.length > maxText)
    throw new ValidationError(`Keep the text below ${maxText} characters.`);
  const rawAlt = form.get("attachmentAlt");
  const alt = (typeof rawAlt === "string" ? rawAlt.trim() : "").slice(0, 180);
  const files = form
    .getAll("images")
    .filter((file): file is File => typeof file !== "string" && file.size > 0);
  const drawing = form.get("drawingData");
  const hasDrawing = typeof drawing === "string" && drawing.length > 0;
  if (files.length + Number(hasDrawing) > 3)
    throw new ValidationError(
      "Attach up to three images or sketches per contribution.",
    );
  if ((files.length || hasDrawing) && alt.length < 6)
    throw new ValidationError(
      "Add a short image description for readers who cannot see it.",
    );
  const attachments: AttachmentInput[] = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE)
      throw new ValidationError("Each image must be 2 MB or smaller.");
    const data = Buffer.from(await file.arrayBuffer());
    const mime = imageMime(data);
    if (!mime || mime !== file.type)
      throw new ValidationError(
        "Use a PNG, JPEG or WebP image. SVG and other file types are not supported.",
      );
    await validateImage(data);
    attachments.push({ data, mime, alt, kind: "image" });
  }
  if (hasDrawing) {
    if (
      !drawing.startsWith("data:image/png;base64,") ||
      drawing.length > MAX_IMAGE * 1.4
    )
      throw new ValidationError("The sketch is too large or is not a PNG.");
    const data = Buffer.from(
      drawing.slice("data:image/png;base64,".length),
      "base64",
    );
    if (imageMime(data) !== "image/png")
      throw new ValidationError(
        "The sketch could not be read. Please redraw it.",
      );
    await validateImage(data);
    attachments.push({ data, mime: "image/png", alt, kind: "drawing" });
  }
  if (!attachments.length && body.length < 8)
    throw new ValidationError(
      "Add at least eight characters, an image or a sketch.",
    );
  return { body, attachments };
}
