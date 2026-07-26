import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { loginWithDemoCredentials } from "./auth.server";

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