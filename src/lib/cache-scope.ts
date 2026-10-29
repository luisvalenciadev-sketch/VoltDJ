import "server-only";

/**
 * Parte de la clave de caché que separa los datos de cada proceso cuando el almacén vive en memoria.
 * `unstable_cache` guarda en disco (.next/cache) y sobrevive a un reinicio del servidor; con el almacén
 * en memoria (pruebas), el proceso nuevo arranca con datos iniciales pero leería lo que dejó el anterior.
 * Con Neon la clave no cambia: la caché sigue compartida entre instancias y despliegues.
 */
const PROCESS_ID = `${process.pid}-${Date.now().toString(36)}`;

export const cacheScope = () => (process.env.CATALOG_STORE === "memory" && !process.env.DATABASE_URL ? `mem-${PROCESS_ID}` : "db");
