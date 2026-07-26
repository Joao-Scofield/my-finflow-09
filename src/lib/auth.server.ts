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

    if (isOpaqueSupabaseKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
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

async function ensureDemoUser(username: DemoUsername, password: string) {
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
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return userId;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: demoUser.email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  if (!data.user) throw new Error("Não foi possível criar o usuário de teste.");
  return data.user.id;
}

async function upsertProfile(userId: string, username: DemoUsername) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const demoUser = DEMO_USERS[username];
  const { error } = await supabaseAdmin.from("profiles").upsert(
    {
      user_id: userId,
      username,
      display_name: demoUser.displayName,
      preferences: {},
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function loginWithDemoCredentials(input: {
  username: string;
  password: string;
}): Promise<LoginResult | LoginFailure> {
  const username = input.username.trim().toLowerCase();
  const password = input.password;
  const expectedPassword = process.env.FINLYN_DEMO_PASSWORD;

  if (!expectedPassword) throw new Error("Senha de teste não configurada no backend.");
  if (!isDemoUsername(username) || !safeEquals(password, expectedPassword)) {
    return { ok: false, message: "Usuário ou senha inválidos." };
  }

  const userId = await ensureDemoUser(username, expectedPassword);
  await upsertProfile(userId, username);

  const authClient = createPublicAuthClient();
  const { data, error } = await authClient.auth.signInWithPassword({
    email: DEMO_USERS[username].email,
    password: expectedPassword,
  });

  if (error || !data.session) {
    console.error(error);
    return { ok: false, message: "Não foi possível iniciar a sessão." };
  }

  return {
    ok: true,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: data.session.user.id,
      username,
      displayName: DEMO_USERS[username].displayName,
    },
  };
}