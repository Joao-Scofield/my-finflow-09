import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, LockKeyhole, Wallet } from "lucide-react";
import { toast } from "sonner";

import { loginDemoUser } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LoginProps {
  onLoggedIn: () => void;
}

export function Login({ onLoggedIn }: LoginProps) {
  const login = useServerFn(loginDemoUser);
  const [username, setUsername] = useState("rebeka");
  const [password, setPassword] = useState("123");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await login({ data: { username, password } });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      if (error) throw error;

      toast.success(`Bem-vindo(a), ${result.user.displayName}.`);
      onLoggedIn();
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm border-border/70 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">Entrar no Finlyn</CardTitle>
            <CardDescription>Use um dos usuários de teste para acessar seus dados.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="rebeka ou joao"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="123"
              />
            </div>
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
              Entrar
            </Button>
          </form>
          <div className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            Usuários: rebeka / 123 ou joao / 123
          </div>
        </CardContent>
      </Card>
    </div>
  );
}