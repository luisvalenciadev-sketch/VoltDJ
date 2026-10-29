import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin-auth";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, saveLocalMedia, uploadMode, VIDEO_TYPES } from "@/lib/media";

/**
 * Subida de fotos y videos del panel. Con Vercel Blob, entrega un token para que el navegador suba directo
 * (sin pasar el archivo por el servidor ni chocar con el límite de 1 MB de las Server Actions).
 * Sin Blob (desarrollo y pruebas), recibe el archivo ya optimizado por el navegador y lo guarda en memoria.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Tu sesión expiró. Vuelve a ingresar al panel." }, { status: 401 });
  // Subir fotos y videos es editar el catálogo o el contenido: solo el dueño.
  if (session.role !== "dueno") return NextResponse.json({ error: "Tu usuario no tiene permiso para subir archivos." }, { status: 403 });
  const mode = uploadMode();

  if (mode === "blob") {
    try {
      const body = (await request.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request,
        // El navegador dice si sube un video ("video") o una foto; cada uno con sus tipos y su límite.
        onBeforeGenerateToken: async (_path, clientPayload) =>
          clientPayload === "video"
            ? { allowedContentTypes: [...VIDEO_TYPES], maximumSizeInBytes: MAX_VIDEO_BYTES, addRandomSuffix: true }
            : { allowedContentTypes: [...IMAGE_TYPES], maximumSizeInBytes: MAX_IMAGE_BYTES, addRandomSuffix: true },
      });
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo subir la foto." }, { status: 400 });
    }
  }

  if (mode === "local") {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No llegó ninguna foto." }, { status: 400 });
    const isVideo = (VIDEO_TYPES as readonly string[]).includes(file.type);
    if (!isVideo && !(IMAGE_TYPES as readonly string[]).includes(file.type)) return NextResponse.json({ error: "Solo se aceptan fotos JPG, PNG o WebP, o videos MP4." }, { status: 400 });
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return NextResponse.json({ error: isVideo ? "El video pesa más de 50 MB." : "La foto pesa más de 8 MB." }, { status: 400 });
    return NextResponse.json({ url: saveLocalMedia(new Uint8Array(await file.arrayBuffer()), file.type) });
  }

  return NextResponse.json({ error: "Falta conectar el almacenamiento de fotos: en Vercel, Storage → Blob → conectar al proyecto." }, { status: 503 });
}
