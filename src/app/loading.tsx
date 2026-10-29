export default function Loading() {
  return (
    <div className="wrap" style={{ paddingBlock: "var(--s6)" }} aria-busy="true" aria-label="Cargando">
      <div className="sk" style={{ height: 36, width: "40%", marginBottom: 24 }} />
      <div className="grid-p">
        {Array.from({ length: 8 }, (_, i) => (
          <div className="card" key={i}>
            <div className="img sk" style={{ borderRadius: 0 }} />
            <div className="body">
              <div className="sk" style={{ height: 10, width: "40%" }} />
              <div className="sk" style={{ height: 14, width: "90%" }} />
              <div className="sk" style={{ height: 18, width: "60%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
