import { Navbar } from "@/components/layout/navbar"
import { DashboardProvider } from "@/components/providers/dashboard-provider"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  let hasSeenWelcome = true

  // Get user's welcome status
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hasSeenWelcome: true }
    })
    hasSeenWelcome = user?.hasSeenWelcome ?? false
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-yellow-50/20 to-green-50/30 dark:from-orange-950/10 dark:via-yellow-950/5 dark:to-green-950/10">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <DashboardProvider hasSeenWelcome={hasSeenWelcome}>
          {children}
        </DashboardProvider>
      </main>
    </div>
  )
}
