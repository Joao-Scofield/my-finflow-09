import type { ComponentType, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/finance/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Painel" },
  { to: "/saldos", label: "Saldos" },
  { to: "/projecao", label: "Projeção" },
  { to: "/frota", label: "Frota" },
  { to: "/lista", label: "Lista" },
  { to: "/contas", label: "Contas" },
  { to: "/comprovante", label: "Comprovante" },
] as const;

interface Props {
  icon: ComponentType<{ className?: string }>;
  active: (typeof navItems)[number]["to"];
  actions?: ReactNode;
}

export function AppHeader({ icon: Icon, active, actions }: Props) {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="surface-emerald grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {navItems.map((item) => (
              <Button
                key={item.to}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "rounded-full",
                  item.to === active && "bg-accent text-accent-foreground font-semibold",
                )}
              >
                <Link to={item.to} preload="intent">
                  {item.label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
