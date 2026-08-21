import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { VarianceLogo } from "@/components/brand/variance-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between gap-3">
          <Link href="/" className="shrink-0">
            <VarianceLogo className="[&_span:first-of-type]:text-base sm:[&_span:first-of-type]:text-lg" />
          </Link>

          <AppNav />

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                title={user.email ?? "Sign out"}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container pb-24 pt-6 md:pb-10">{children}</main>
    </div>
  );
}
