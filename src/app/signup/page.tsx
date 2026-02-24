"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { signUp } from "@/actions/auth";
import { useFormStatus } from "react-dom";
import { useSnackbar } from "@/components/ui/snackbar-provider";
import { useUser } from "@/hooks/use-user";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : children}
    </Button>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { showError, showSuccess } = useSnackbar();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleSubmit(formData: FormData) {
    const result = await signUp(formData);
    if (result?.error) showError(result.error);
    if (result?.message) showSuccess(result.message);
  }

  if (loading || user) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>
            Sign up to save your cashflow and access it from any device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>
            <SubmitButton>Sign up</SubmitButton>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
      <Link href="/" className="mt-6 text-sm text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
    </main>
  );
}
