import Link from "next/link";
import { getUser } from "@/lib/supabase/server";

export default async function Navbar() {
  const { user } = await getUser();

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-neutral-50/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-neutral-900 text-xs text-white">
            P
          </span>
          SellYourPrompt
        </Link>

        <div className="flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-full px-3 py-2 text-neutral-600 hover:text-neutral-900">
            Explore
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="rounded-full px-3 py-2 text-neutral-600 hover:text-neutral-900">
                Dashboard
              </Link>
              <form action="/auth/signout" method="post">
                <button className="rounded-full px-3 py-2 text-neutral-600 hover:text-neutral-900">
                  Sign out
                </button>
              </form>
              <Link href="/sell" className="btn ml-2">
                Sell a prompt
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-2 text-neutral-600 hover:text-neutral-900">
                Sign in
              </Link>
              <Link href="/login?next=/sell" className="btn ml-2">
                Start selling
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
