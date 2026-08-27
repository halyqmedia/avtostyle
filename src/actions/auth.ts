"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await signIn("credentials", { email, password, redirectTo: "/crm" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email немесе құпия сөз қате" };
    }
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
