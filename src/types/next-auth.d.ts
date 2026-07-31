import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    roleKey?: string;
    roleLabel?: string;
    permissions?: string[];
  }

  interface Session {
    user: {
      id: string;
      roleKey: string;
      roleLabel: string;
      permissions: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roleKey?: string;
    roleLabel?: string;
    permissions?: string[];
  }
}
