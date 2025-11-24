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
import { User, LogOut, BarChart3, Menu, BookOpen, Upload, GraduationCap, Layers } from "lucide-react"
import packageJson from "../../../package.json"

// Navigation link with flip animation to Chinese
function NavLink({ href, english, chinese, icon: Icon }: { href: string; english: string; chinese: string; icon?: any }) {
  return (
    <Link href={href} className="group flex items-center text-sm font-medium">
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
    </Link>
  )
}

export function Navbar() {
  const { data: session } = useSession()

  return (
    <header className="border-b bg-gradient-to-r from-orange-50 via-yellow-50 to-green-50 dark:from-orange-950/20 dark:via-yellow-950/20 dark:to-green-950/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 group">
          <img src="/logo.png" alt="Mangolin" className="h-14 w-14" />
          <div className="flex flex-col -space-y-1">
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 bg-clip-text text-transparent group-hover:from-orange-500 group-hover:via-red-400 group-hover:to-orange-500 transition-all">
              Mangolin
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-muted-foreground tracking-wider">
                芒果林
              </span>
              <span className="text-xs text-muted-foreground/50">
                v{packageJson.version}
              </span>
            </div>
          </div>
        </Link>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/deck" className="flex items-center group">
                    <Layers className="h-4 w-4 mr-2" />
                    <span className="group-hover:hidden">My Deck</span>
                    <span className="hidden group-hover:inline text-primary font-semibold">我的卡片</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/upload" className="flex items-center group">
                    <Upload className="h-4 w-4 mr-2" />
                    <span className="group-hover:hidden">Upload Notes</span>
                    <span className="hidden group-hover:inline text-primary font-semibold">上传笔记</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/review" className="flex items-center group">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    <span className="group-hover:hidden">Review</span>
                    <span className="hidden group-hover:inline text-primary font-semibold">复习</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/lessons" className="flex items-center group">
                    <BookOpen className="h-4 w-4 mr-2" />
                    <span className="group-hover:hidden">Lessons</span>
                    <span className="hidden group-hover:inline text-primary font-semibold">课程</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/stats" className="flex items-center group">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    <span className="group-hover:hidden">Stats</span>
                    <span className="hidden group-hover:inline text-primary font-semibold">统计</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs">
                  {session.user?.email}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {session ? (
            <>
              <NavLink href="/deck" english="My Deck" chinese="我的卡片" icon={Layers} />
              <NavLink href="/upload" english="Upload Notes" chinese="上传笔记" icon={Upload} />
              <NavLink href="/review" english="Review" chinese="复习" icon={GraduationCap} />
              <NavLink href="/lessons" english="Lessons" chinese="课程" icon={BookOpen} />
              <NavLink href="/stats" english="Stats" chinese="统计" icon={BarChart3} />
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
