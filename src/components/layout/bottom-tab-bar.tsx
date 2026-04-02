"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Layers, GraduationCap, BookOpen, BarChart3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useDueCount } from "@/hooks/use-due-count"
import { isNative } from "@/lib/capacitor"

interface Tab {
  href: string
  label: string
  icon: typeof Layers
  matchPaths: string[]
  badge?: number | null
}

export function BottomTabBar() {
  const pathname = usePathname()
  const { data: dueCount } = useDueCount()

  // Hide during focused review sessions (when on /review and session is active)
  // The review page adds 'review-active' class to body when in session
  const isReviewSession = pathname === "/review"

  const tabs: Tab[] = [
    {
      href: "/",
      label: "Home",
      icon: Layers,
      matchPaths: ["/", "/deck"]
    },
    {
      href: "/review",
      label: "Review",
      icon: GraduationCap,
      matchPaths: ["/review"],
      badge: dueCount
    },
    {
      href: "/lessons",
      label: "Learn",
      icon: BookOpen,
      matchPaths: ["/lessons", "/stories", "/upload"]
    },
    {
      href: "/stats",
      label: "Stats",
      icon: BarChart3,
      matchPaths: ["/stats", "/profile", "/changelog"]
    }
  ]

  const isActive = (tab: Tab) =>
    tab.matchPaths.some(p =>
      p === "/" ? pathname === "/" : pathname.startsWith(p)
    )

  const handleTap = async () => {
    if (!isNative()) return
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics")
      Haptics.impact({ style: ImpactStyle.Light })
    } catch {
      // Haptics not available
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background/95 backdrop-blur-md keyboard-hide"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const active = isActive(tab)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={handleTap}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[48px] px-3 py-1 rounded-lg transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-6 w-6 transition-all ${active ? "fill-primary/20" : ""}`}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                {tab.badge != null && tab.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-3 h-4 min-w-4 px-1 text-[10px] justify-center"
                  >
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </Badge>
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? "text-primary" : ""}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
