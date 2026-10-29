import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifyAdminToken } from "@/lib/admin-auth";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, saveLocalMedia, uploadMode } from "@/lib/media";

/**
 * Subida de fotos del panel. Con Vercel Blob, entrega un token para que el navegador suba directo
 * (sin pasar el archivo por el servidor ni chocar con el límite de 1 MB de las Server Actions).
 * Sin Blob (desarrollo y pruebas), recibe el archivo ya optimizado por el navegador y lo guarda en memoria.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await verifyAdminToken((await cookies()).get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Tu sesión expiró. Vuelve a ingresar al panel." }, { status: 401 });
  }
  const mode = uploadMode();

  if (mode === "blob") {
    try {
      const body = (await request.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [...IMAGE_TYPES],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
        }),
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
    if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return NextResponse.json({ error: "Solo se aceptan fotos JPG, PNG o WebP." }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "La foto pesa más de 8 MB." }, { status: 400 });
    return NextResponse.json({ url: saveLocalMedia(new Uint8Array(await file.arrayBuffer()), file.type) });
  }

  return NextResponse.json({ error: "Falta conectar el almacenamiento de fotos: en Vercel, Storage → Blob → conectar al proyecto." }, { status: 503 });
}
