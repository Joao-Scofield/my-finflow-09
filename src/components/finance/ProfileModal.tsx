import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useFinance } from "@/lib/finance-store";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: Props) {
  const { profile, updateProfileName } = useFinance();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(profile?.displayName ?? "");
    setPassword("");
    setPassword2("");
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, [open, profile?.displayName]);

  async function handleSave() {
    if (password && password !== password2) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password && password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      if (name.trim() && name.trim() !== profile?.displayName) {
        await updateProfileName(name.trim());
      }
      if (password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      }
      toast.success("Perfil atualizado!");
      onOpenChange(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      let msg = "Não foi possível salvar o perfil.";
      if (/weak|easy to guess/i.test(raw))
        msg = "Essa senha é considerada fraca. Tente uma senha diferente.";
      else if (/same as the old|same password/i.test(raw))
        msg = "A nova senha não pode ser igual à atual.";
      else if (/at least 6/i.test(raw))
        msg = "A senha precisa ter pelo menos 6 caracteres.";
      else if (raw) msg = raw;
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input id="profile-email" value={email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome de exibição</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-pass">Nova senha</Label>
            <Input
              id="profile-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Deixe em branco para manter"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-pass2">Confirmar nova senha</Label>
            <Input
              id="profile-pass2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
