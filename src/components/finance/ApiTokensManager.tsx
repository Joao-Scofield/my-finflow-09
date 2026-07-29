import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TokenRow {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `fin_${hex}`;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function ApiTokensManager({ open, onOpenChange }: Props) {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [endpoint, setEndpoint] = useState("/api/public/transactions");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("finance_api_tokens")
      .select("id,name,token_prefix,last_used_at,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar os tokens.");
      return;
    }
    setTokens((data ?? []) as TokenRow[]);
  }, []);

  useEffect(() => {
    if (!open) return;
    setFreshToken(null);
    setEndpoint(`${window.location.origin}/api/public/transactions`);
    void load();
  }, [open, load]);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("sem sessão");
      const token = randomToken();
      const { error } = await supabase.from("finance_api_tokens").insert({
        user_id: userData.user.id,
        name: name.trim(),
        token_prefix: `${token.slice(0, 12)}…`,
        token_hash: await sha256Hex(token),
      });
      if (error) throw error;
      setFreshToken(token);
      setName("");
      await load();
    } catch {
      toast.error("Não foi possível criar o token.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("finance_api_tokens").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível revogar o token.");
      return;
    }
    toast.success("Token revogado.");
    await load();
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Copiado!");
  }

  const curlExample = `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"expense","amount":49.9,"date":"2026-07-29","description":"iFood","category":"Alimentação","paymentMethod":"pix","account":"Conta corrente"}'`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Integrações / API
          </DialogTitle>
          <DialogDescription>
            Crie um token pessoal para enviar lançamentos de sistemas externos (n8n, Zapier,
            planilhas, scripts).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div>
              <Label className="text-xs">Nome do token</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: n8n, planilha, automação"
                maxLength={60}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={creating || !name.trim()}>
                <Plus className="mr-1 h-4 w-4" />
                Gerar token
              </Button>
            </div>
          </div>

          {freshToken && (
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-xs font-medium">
                Copie agora — este valor não será exibido novamente.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                  {freshToken}
                </code>
                <Button size="icon" variant="outline" onClick={() => copy(freshToken)}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Tokens ativos</Label>
            {tokens.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum token criado ainda.
              </p>
            )}
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.token_prefix} ·{" "}
                    {t.last_used_at
                      ? `último uso em ${new Date(t.last_used_at).toLocaleString("pt-BR")}`
                      : "nunca usado"}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => void handleDelete(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Endpoint</Label>
              <Button size="sm" variant="ghost" onClick={() => copy(endpoint)}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copiar URL
              </Button>
            </div>
            <code className="block truncate rounded bg-muted px-2 py-1 text-xs">{endpoint}</code>
            <p className="text-xs text-muted-foreground">
              <strong>POST</strong> cria lançamentos (aceita um objeto ou uma lista) e{" "}
              <strong>GET</strong> lista os seus lançamentos (filtros: <code>from</code>,{" "}
              <code>to</code>, <code>limit</code>).
            </p>
            <div className="flex items-start justify-between gap-2">
              <pre className="min-w-0 flex-1 overflow-x-auto rounded bg-muted p-2 text-[11px] leading-relaxed">
                {curlExample}
              </pre>
              <Button size="icon" variant="ghost" onClick={() => copy(curlExample)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
