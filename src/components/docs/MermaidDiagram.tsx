import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;
function ensureInit(dark: boolean) {
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily: "inherit",
  });
  initialized = true;
}

interface MermaidDiagramProps {
  code: string;
  id: string;
}

export const MermaidDiagram = ({ code, id }: MermaidDiagramProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  );

  // Watch theme changes on <html class="dark">
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains("dark"));
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    ensureInit(isDark);
    const renderId = `mermaid-${id}-${isDark ? "d" : "l"}-${Date.now()}`;
    mermaid
      .render(renderId, code)
      .then(({ svg }) => {
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? "Failed to render diagram");
      });
    return () => {
      cancelled = true;
    };
    // re-render when code or theme changes
  }, [code, id, isDark]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Diagram error: {error}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 overflow-x-auto">
      <div ref={ref} className="flex justify-center [&_svg]:max-w-full [&_svg]:h-auto" />
    </div>
  );
};

export default MermaidDiagram;
