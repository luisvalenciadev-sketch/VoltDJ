/**
 * Cargador: el medidor del logo en vivo. Aparece con 150 ms de retraso: si la página llega
 * antes, el usuario nunca ve un parpadeo de carga. Ciclo corto (0.9 s): un indicador rápido
 * hace que la espera se perciba más corta.
 */
export default function Loading() {
  return (
    <div className="loader" role="status">
      <span className="eqload" aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <i key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </span>
      <span className="eyebrow">Cargando</span>
    </div>
  );
}
