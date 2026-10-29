"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart-store";
import { CartIcon, SearchIcon } from "./icons";

export function SearchForm({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const current = pathname === "/buscar" ? (params.get("q") ?? "") : "";
  const [q, setQ] = useState(current);
  useEffect(() => setQ(current), [current]);

  return (
    <form
      className="search"
      role="search"
      action="/buscar"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/buscar?q=${encodeURIComponent(term)}` : "/catalogo");
      }}
    >
      <SearchIcon />
      <label className="sr-only" htmlFor={id}>
        Buscar productos
      </label>
      <input id={id} name="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca CDJ, controladores, parlantes, marcas…" autoComplete="off" enterKeyHint="search" maxLength={80} />
    </form>
  );
}

export function CartButton() {
  const { count, ready } = useCart();
  return (
    <Link className="iconbtn" href="/carrito" aria-label={ready && count ? `Carrito, ${count} ${count === 1 ? "unidad" : "unidades"}` : "Carrito"}>
      <CartIcon />
      <span className="lbl">Carrito</span>
      {ready && count > 0 && (
        <span className="badge" aria-hidden="true" key={count}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function CategoryNav({ categories, showOffers }: { categories: { slug: string; name: string }[]; showOffers: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="catnav" aria-label="Categorías">
      <div className="wrap">
        {showOffers && (
          <Link className="hot" href="/ofertas" aria-current={pathname === "/ofertas" ? "page" : undefined}>
          Ofertas
        </Link>
        )}
        {categories.map((c) => {
          const href = `/catalogo/${c.slug}`;
          return (
            <Link key={c.slug} href={href} aria-current={pathname === href ? "page" : undefined}>
              {c.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
