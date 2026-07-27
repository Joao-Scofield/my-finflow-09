import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { loginWithDemoCredentials, signUpNewUser } from "./auth.server";

export const loginDemoUser = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        username: z.string().trim().min(1).max(32),
        password: z.string().min(1).max(128),
      })
      .parse(data),
  )
  .handler(async ({ data }) => loginWithDemoCredentials(data));

export const signUpUser = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        username: z.string().trim().min(3).max(32),
        password: z.string().min(6).max(128),
        displayName: z.string().trim().min(1).max(60),
      })
      .parse(data),
  )
  .handler(async ({ data }) => signUpNewUser(data));
