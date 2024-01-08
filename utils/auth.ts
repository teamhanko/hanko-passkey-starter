import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import {
  tenant,
  PasskeyProvider,
} from "@teamhanko/passkeys-next-auth-provider";

import prisma from "./db";

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET_ID!,
    }),
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
    PasskeyProvider({
      tenant: tenant({
        apiKey: process.env.PASSKEYS_API_KEY!,
        tenantId: process.env.NEXT_PUBLIC_PASSKEYS_TENANT_ID!,
      }),
      async authorize({ userId }) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;
        return {
          id: user!.id,
          name: user!.name || "",
        };
      },
    }),
  ],
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (!token.email) {
        return {};
      }
      if (user) {
        token.user = user;
      }
      return token;
    },
    session: async ({ session, token }) => {
      (session.user) = {
        id: token.sub,
        // @ts-ignore
        ...(token || session).user,
      };
      console.log("session", session);
      return session;
    },
  },
} satisfies NextAuthOptions;
