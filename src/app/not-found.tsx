import Link from "next/link";
import { SearchIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="wrap" style={{ paddingBlock: "var(--s7)" }}>
      <div className="empty">
        <SearchIcon />
        <h1 className="disp" style={{ fontSize: "var(--t-xl)" }}>Página no encontrada</h1>
        <p>El producto o la página que buscas no existe o ya no está publicado.</p>
        <div className="row-wrap" style={{ justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/catalogo">Ir al catálogo</Link>
          <Link className="btn btn-ghost" href="/">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
