import type { Metadata } from "next";
import { AuthPage } from "./auth-page";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <AuthPage mode="login" />;
}

// DsaKaro
