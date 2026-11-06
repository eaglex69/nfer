"use client";

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import FarmGame from "./components/FarmGame";
import AdminPanel from "./components/admin/AdminPanel";
import { DesignProvider } from "./components/DesignProvider";
import { DEFAULT_DESIGN, designCss, sanitizeDesign, type Design } from "./lib/design-config";

declare global {
  interface Window {
    __VALLEY_CANVAS__?: boolean;
    __VALLEY_ADMIN__?: { displayName: string; username: string };
  }
}

window.__VALLEY_CANVAS__ = true;

function PhpApp() {
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch("/api/design", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { design?: unknown; css?: string };
        if (!alive) return;
        const next = sanitizeDesign(data.design);
        setDesign(next);
        const tag = document.getElementById("game-design");
        if (tag) tag.textContent = data.css ?? designCss(next);
      } catch { /* интерфейс продолжит работать с темой по умолчанию */ }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const isAdmin = document.body.dataset.page === "admin";
  const admin = window.__VALLEY_ADMIN__ ?? { displayName: "Администратор", username: "admin" };
  return <DesignProvider design={design}>{isAdmin ? <AdminPanel admin={admin} /> : <FarmGame />}</DesignProvider>;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<PhpApp />);
