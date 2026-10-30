import { NextResponse } from "next/server";
import { notifyDueGuides } from "@/lib/notifications";

/**
 * Revisión diaria de avisos (vercel.json → crons). Los pedidos en modo automático avanzan solos con la
 * hora: esta tarea les escribe a los clientes aunque nadie abra el panel ni la página del pedido.
 * Vercel firma la llamada con CRON_SECRET; sin esa variable, la ruta no hace nada.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const result = await notifyDueGuides();
  return NextResponse.json(result);
}
