import type { ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Database, Network, Wand2 } from "lucide-react";

function NavItem({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
          isActive
            ? "bg-zinc-900 text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
            : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100",
        ].join(" ")
      }
    >
      <span className="text-zinc-400 group-hover:text-zinc-200">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppShell() {
  const loc = useLocation();
  const title =
    loc.pathname === "/level-1"
      ? "Рівень 1"
      : loc.pathname === "/level-2"
        ? "Рівень 2"
        : loc.pathname === "/ingest"
          ? "Імпорт тексту"
          : "Огляд";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_0_6px_rgba(14,165,233,0.10)]" />
            <span className="text-sm font-semibold tracking-wide">Graph Model Studio</span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            <NavItem to="/level-1" label="Класи" icon={<Network size={16} />} />
            <NavItem to="/level-2" label="Об’єкти" icon={<Database size={16} />} />
            <NavItem to="/ingest" label="Текст → модель" icon={<Wand2 size={16} />} />
          </nav>
          <div className="text-xs text-zinc-400">{title}</div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
