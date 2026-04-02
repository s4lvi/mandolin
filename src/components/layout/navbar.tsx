"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { User, LogOut, BarChart3, BookOpen, Upload, GraduationCap, Layers, Settings, Sparkles } from "lucide-react"
import { useDueCount } from "@/hooks/use-due-count"
import packageJson from "../../../package.json"

// Navigation link with flip animation to Chinese
function NavLink({ href, english, chinese, icon: Icon, badge }: { href: string; english: string; chinese: string; icon?: any; badge?: number | null }) {
  return (
    <Link href={href} className="group flex items-center text-sm font-medium gap-1">
      {Icon && <Icon className="h-4 w-4 mr-1 flex-shrink-0" />}
      <div className="relative h-6 overflow-hidden">
        <div className="transition-transform duration-300 group-hover:-translate-y-6">
          <div className="h-6 flex items-center">
            <span>{english}</span>
          </div>
          <div className="h-6 flex items-center">
            <span className="text-primary font-semibold">{chinese}</span>
          </div>
        </div>
      </div>
      {badge != null && badge > 0 && (
        <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs justify-center">
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
    </Link>
  )
}

export function Navbar() {
  const { data: session } = useSession()
  const { data: dueCount } = useDueCount()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "lg:border-b lg:bg-gradient-to-r lg:from-orange-50 lg:via-yellow-50 lg:to-green-50 lg:dark:from-orange-950/20 lg:dark:via-yellow-950/20 lg:dark:to-green-950/20 lg:backdrop-blur-sm"
          : "border-b bg-gradient-to-r from-orange-50 via-yellow-50 to-green-50 dark:from-orange-950/20 dark:via-yellow-950/20 dark:to-green-950/20 backdrop-blur-sm"
      }`}
      style={scrolled ? {
        // On mobile when scrolled: gradient mask fading to transparent at bottom
        WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
        maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
      } : undefined}
    >
      <div className={`container mx-auto px-4 flex items-center justify-between transition-all duration-300 ${
        scrolled ? "h-10 lg:h-16" : "h-16"
      }`}>
        <Link href="/" className="flex items-center gap-2 lg:gap-3 transition-transform hover:scale-105 group">
          <img
            src="/logo.png"
            alt="Mangolin"
            className={`transition-all duration-300 ${scrolled ? "h-8 w-8 lg:h-14 lg:w-14" : "h-14 w-14"}`}
          />
          <div className={`flex flex-col transition-all duration-300 ${scrolled ? "-space-y-0.5" : "-space-y-1"}`}>
            <span className={`font-bold tracking-tight bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 bg-clip-text text-transparent transition-all duration-300 ${
              scrolled ? "text-lg lg:text-2xl" : "text-2xl"
            }`}>
              Mangolin
            </span>
            <div className={`flex items-baseline gap-2 transition-all duration-300 ${scrolled ? "hidden lg:flex" : "flex"}`}>
              <span className="text-sm font-medium text-muted-foreground tracking-wider">
                芒果林
              </span>
              <span className="text-xs text-muted-foreground/50">
                v{packageJson.version}
              </span>
            </div>
          </div>
        </Link>

        {/* Mobile/tablet: just auth buttons for unauthenticated users (bottom tabs handle nav) */}
        <div className="lg:hidden">
          {!session && (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-4">
          {session ? (
            <>
              <NavLink href="/deck" english="Deck" chinese="卡片" icon={Layers} />
              <NavLink href="/upload" english="Upload" chinese="上传" icon={Upload} />
              <NavLink href="/review" english="Review" chinese="复习" icon={GraduationCap} badge={dueCount} />
              <NavLink href="/lessons" english="Lessons" chinese="课程" icon={BookOpen} />
              <NavLink href="/stories" english="Stories" chinese="故事" icon={BookOpen} />
              <NavLink href="/stats" english="Stats" chinese="统计" icon={BarChart3} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {session.user?.name || session.user?.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/changelog" className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      What's New
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
