import type { Metadata } from "next";
import { AuthPage } from "../login/auth-page";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}

// DsaKaro
