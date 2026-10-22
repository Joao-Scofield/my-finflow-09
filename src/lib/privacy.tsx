import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PrivacyCtx {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyCtx | null>(null);

/**
 * Oculta os valores do conteúdo principal (`main`) como nos apps de banco.
 * Começa sempre oculto e não guarda nada: ao reabrir o app, os valores voltam a ficar ocultos.
 * Um clique em qualquer lugar do conteúdo, ou no botão do cabeçalho, exibe os valores.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.privacy = hidden ? "hidden" : "visible";
  }, [hidden]);

  useEffect(() => {
    if (!hidden) return;

    function reveal(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("main")) return;
      event.preventDefault();
      event.stopPropagation();
      setHidden(false);
    }

    document.addEventListener("click", reveal, true);
    return () => document.removeEventListener("click", reveal, true);
  }, [hidden]);

  return (
    <PrivacyContext.Provider value={{ hidden, toggle: () => setHidden((h) => !h) }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used within PrivacyProvider");
  return ctx;
}
