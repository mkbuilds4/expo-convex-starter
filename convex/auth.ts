import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { expo } from "@better-auth/expo";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: [
      "expostarter://",
      // Expo Go / development (exp://IP:port)
      "exp://",
    ],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    user: {
      deleteUser: { enabled: true },
    },
    plugins: [expo(), convex({ authConfig })],
  });
};

export const { getAuthUser } = authComponent.clientApi();
