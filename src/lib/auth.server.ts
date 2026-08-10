import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const DEMO_USERS = {
  rebeka: { email: "rebeka@finlyn.local", displayName: "Rebeka" },
  joao: { email: "joao@finlyn.local", displayName: "João" },
} as const;

type DemoUsername = keyof typeof DEMO_USERS;

interface LoginResult {
  ok: true;
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface LoginFailure {
  ok: false;
  message: string;
}

function isDemoUsername(username: string): username is DemoUsername {
  return username === "rebeka" || username === "joao";
}

function emailForUsername(username: string) {
  return `${username}@finlyn.local`;
}

function safeEquals(a: string, b: string): boolean {
  const left = createHash("sha256").update(a, "utf8").digest();
  const right = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(left, right);
}

function isOpaqueSupabaseKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isOpaqueSupabaseKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createPublicAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Backend de autenticação não está configurado.");

  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function ensureDemoUser(username: DemoUsername, authPassword: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const demoUser = DEMO_USERS[username];
  const metadata = { username, display_name: demoUser.displayName };

  const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const existing = usersPage.users.find((user) => user.email?.toLowerCase() === demoUser.email);
  const userId = existing?.id;

  if (userId) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: authPassword,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return userId;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: demoUser.email,
    password: authPassword,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Não foi possível criar o usuário de teste.");
  return data.user.id;
}

async function upsertProfile(userId: string, username: string, displayName: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId,
      username,
      display_name: displayName,
      preferences: {},
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

async function findUserIdByEmail(email: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email)?.id;
}

async function startSession(
  email: string,
  password: string,
  username: string,
  displayName: string,
): Promise<LoginResult | LoginFailure> {
  const authClient = createPublicAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return { ok: false, message: "Usuário ou senha inválidos." };
  }

  return {
    ok: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: { id: data.session.user.id, username, displayName },
  };
}

export async function loginWithDemoCredentials(input: {
  username: string;
  password: string;
}): Promise<LoginResult | LoginFailure> {
  const username = input.username.trim().toLowerCase();
  const password = input.password;
  const expectedPassword = process.env.FINLYN_DEMO_PASSWORD;
  const authPassword = process.env.FINLYN_LOGIN_SECRET;

  // Legacy demo accounts keep their shared test password.
  if (isDemoUsername(username) && expectedPassword && safeEquals(password, expectedPassword)) {
    if (!authPassword) throw new Error("Senha interna de autenticação não configurada no backend.");
    const userId = await ensureDemoUser(username, authPassword);
    await upsertProfile(userId, username, DEMO_USERS[username].displayName);
    return startSession(
      DEMO_USERS[username].email,
      authPassword,
      username,
      DEMO_USERS[username].displayName,
    );
  }

  const email = emailForUsername(username);
  const userId = await findUserIdByEmail(email);
  if (!userId) return { ok: false, message: "Usuário ou senha inválidos." };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();

  return startSession(email, password, username, profile?.display_name ?? username);
}

export async function signUpNewUser(input: {
  username: string;
  password: string;
  displayName: string;
}): Promise<LoginResult | LoginFailure> {
  const username = input.username.trim().toLowerCase();
  const displayName = input.displayName.trim() || username;
  const password = input.password;

  if (!/^[a-z0-9_.-]{3,32}$/.test(username)) {
    return {
      ok: false,
      message: "Use de 3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou underline.",
    };
  }
  if (isDemoUsername(username)) {
    return { ok: false, message: "Esse nome de usuário já está em uso." };
  }

  const email = emailForUsername(username);
  const existing = await findUserIdByEmail(email);
  if (existing) return { ok: false, message: "Esse nome de usuário já está em uso." };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: displayName },
  });

  if (error || !data.user) {
    const message = error?.message ?? "";
    if (/pwned|leaked|breach/i.test(message)) {
      return {
        ok: false,
        message: "Essa senha aparece em vazamentos conhecidos. Escolha uma senha mais forte.",
      };
    }
    if (/password/i.test(message)) {
      return { ok: false, message: "Senha muito fraca. Use pelo menos 6 caracteres." };
    }
    console.error(error);
    return { ok: false, message: "Não foi possível criar a conta." };
  }

  await upsertProfile(data.user.id, username, displayName);
  return startSession(email, password, username, displayName);
}
