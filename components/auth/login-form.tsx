"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { VarianceLogo } from "@/components/brand/variance-logo";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "signin" | "signup" | "magic";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get("redirectedFrom") || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(
              redirectedFrom,
            )}`,
          },
        });
        if (error) throw error;
        toast.success("Check your email for a magic link.");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
        router.push(redirectedFrom);
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push(redirectedFrom);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm border-border/80 shadow-md">
      <CardHeader className="space-y-3">
        <VarianceLogo showTagline />
        <CardDescription>
          {mode === "signup"
            ? "Create your account."
            : mode === "magic"
              ? "Sign in with a magic link."
              : "Sign in to your budget."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="label-caps">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {mode !== "magic" && (
            <div className="space-y-2">
              <Label htmlFor="password" className="label-caps">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signup"
              ? "Create account"
              : mode === "magic"
                ? "Send magic link"
                : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 flex flex-col gap-1 text-center text-sm text-muted-foreground">
          {mode !== "magic" && (
            <button
              type="button"
              className="hover:text-foreground hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          )}
          <button
            type="button"
            className="hover:text-foreground hover:underline"
            onClick={() => setMode(mode === "magic" ? "signin" : "magic")}
          >
            {mode === "magic"
              ? "Use email + password instead"
              : "Email me a magic link instead"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
