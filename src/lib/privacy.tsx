import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface PrivacyCtx {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyCtx | null>(null);

/**
 * Oculta os valores do conteúdo principal (`main`) como nos apps de banco.
 * Começa sempre oculto e não guarda nada: ao reabrir o app, os valores voltam a ficar ocultos.
 * Só o botão de olho do cabeçalho exibe ou oculta os valores.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.privacy = hidden ? "hidden" : "visible";
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
