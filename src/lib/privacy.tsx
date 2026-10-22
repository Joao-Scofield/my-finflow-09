import { createContext, useContext, useState, type ReactNode } from "react";

interface PrivacyCtx {
  hidden: boolean;
  toggle: () => void;
}

const PrivacyContext = createContext<PrivacyCtx | null>(null);

export const MASKED_VALUE = "R$******";

// Espelho do estado para os formatadores de moeda, que são funções puras fora do React.
let valuesHidden = true;

export function areValuesHidden() {
  return valuesHidden;
}

/**
 * Oculta os valores monetários como nos apps de banco.
 * Começa sempre oculto e não guarda nada: ao reabrir o app, os valores voltam a ficar ocultos.
 * Só o botão de olho do cabeçalho exibe ou oculta os valores.
 */
export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(true);

  function toggle() {
    valuesHidden = !hidden;
    setHidden(valuesHidden);
  }

  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used within PrivacyProvider");
  return ctx;
}
