"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { User, LogOut, BarChart3 } from "lucide-react"

export function Navbar() {
  const { data: session } = useSession()

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">
          Mandolin
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {session ? (
            <>
              <Link
                href="/deck"
                className="text-sm font-medium hover:text-primary"
              >
                My Deck
              </Link>
              <Link
                href="/upload"
                className="text-sm font-medium hover:text-primary"
              >
                Upload Notes
              </Link>
              <Link
                href="/review"
                className="text-sm font-medium hover:text-primary"
              >
                Review
              </Link>
              <Link
                href="/lessons"
                className="text-sm font-medium hover:text-primary"
              >
                Lessons
              </Link>
              <Link
                href="/stats"
                className="text-sm font-medium hover:text-primary flex items-center"
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Stats
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {session.user?.name || session.user?.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    {session.user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
