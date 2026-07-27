import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, LockKeyhole, UserPlus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { loginDemoUser, signUpUser } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LoginProps {
  onLoggedIn: () => void;
}

type SessionResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      user: { id: string; username: string; displayName: string };
    }
  | { ok: false; message: string };

export function Login({ onLoggedIn }: LoginProps) {
  const login = useServerFn(loginDemoUser);
  const signUp = useServerFn(signUpUser);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function applySession(result: SessionResult) {
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
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await applySession(await login({ data: { username, password } }));
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await applySession(
        await signUp({
          data: {
            username: newUsername,
            password: newPassword,
            displayName: newDisplayName.trim() || newUsername,
          },
        }),
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível criar a conta. Tente novamente.");
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
            <CardTitle className="text-2xl">Finlyn</CardTitle>
            <CardDescription>Entre na sua conta ou crie uma nova.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="space-y-4 pt-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário</Label>
                  <Input
                    id="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    maxLength={32}
                    required
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
                    maxLength={128}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="mr-2 h-4 w-4" />
                  )}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4 pt-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor="new-username">Usuário</Label>
                  <Input
                    id="new-username"
                    autoComplete="username"
                    value={newUsername}
                    onChange={(event) => setNewUsername(event.target.value.toLowerCase())}
                    minLength={3}
                    maxLength={32}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Letras minúsculas, números, ponto, hífen ou underline.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-name">Nome exibido</Label>
                  <Input
                    id="display-name"
                    autoComplete="name"
                    value={newDisplayName}
                    onChange={(event) => setNewDisplayName(event.target.value)}
                    maxLength={60}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={6}
                    maxLength={128}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={6}
                    maxLength={128}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
