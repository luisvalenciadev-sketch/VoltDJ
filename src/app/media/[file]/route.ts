import { getLocalMedia } from "@/lib/media";

/** Fotos subidas sin Vercel Blob (desarrollo y pruebas). En producción las fotos se sirven desde Blob. */
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const media = getLocalMedia(file);
  if (!media) return new Response("No encontrada", { status: 404 });
  return new Response(Buffer.from(media.bytes), {
    headers: { "content-type": media.type, "cache-control": "public, max-age=31536000, immutable" },
  });
}
