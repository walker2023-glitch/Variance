import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
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
    <div className="min-h-dvh bg-muted/20">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Wallet className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">Variance</span>
          </Link>

          <AppNav />

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
      </header>

      <main className="container pb-24 pt-6 md:pb-10">{children}</main>
    </div>
  );
}
