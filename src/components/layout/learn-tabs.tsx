"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, GraduationCap, Users } from "lucide-react"

const TABS = [
  { href: "/lessons", label: "My Lessons", icon: BookOpen },
  { href: "/courses", label: "Courses", icon: GraduationCap },
  { href: "/community", label: "Community", icon: Users }
]

/**
 * Segmented navigation shared across the Learn hub pages
 * (My Lessons / Courses / Community).
 */
export function LearnTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
      {TABS.map((tab) => {
        const active =
          tab.href === "/lessons"
            ? pathname === "/lessons"
            : pathname.startsWith(tab.href)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center justify-center gap-1.5 flex-1 min-w-fit whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
