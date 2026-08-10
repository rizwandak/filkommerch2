import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function HackerModeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  return (
    <button
      onClick={toggle}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle Dark Mode"
      title={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
      className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-ink p-0.5 transition-colors duration-300 focus:outline-none ${
        isDark ? "bg-slate-900 border-zinc-700" : "bg-amber-100 border-amber-300"
      } ${className || ""}`}
    >
      <span className="sr-only">Toggle Dark Mode</span>
      <div
        className={`pointer-events-none flex h-5 w-5 items-center justify-center rounded-full shadow-md transition-transform duration-300 ease-in-out transform ${
          isDark
            ? "translate-x-5.5 bg-indigo-950 text-indigo-300 border border-indigo-700"
            : "translate-x-0 bg-white text-amber-500 border border-amber-200"
        }`}
      >
        {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      </div>
    </button>
  );
}
