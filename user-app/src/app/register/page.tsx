import { AuthForm } from "@/components/AuthForm";
import { Suspense } from "react";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-[var(--text-secondary)]">
          加载中…
        </div>
      }
    >
      <AuthForm mode="register" />
    </Suspense>
  );
}
