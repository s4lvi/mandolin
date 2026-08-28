"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { BookOpen, Upload, Brain, Flame, Target, GraduationCap, Layers, Headphones, PenLine, Puzzle, ArrowRight, BarChart3 } from "lucide-react"
import { BottomTabBar } from "@/components/layout/bottom-tab-bar"
import { ContinueLearning } from "@/components/dashboard/continue-learning"
import { usePreferences } from "@/hooks/use-preferences"

// Progress bar component
function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-2 w-full bg-secondary rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 transition-all shadow-sm"
        style={{ width: `${Math.min(100, value)}%` }}
      />
    </div>
  )
}

// Fetch stats from API
async function fetchStats() {
  const res = await fetch("/api/stats")
  if (!res.ok) throw new Error("Failed to fetch stats")
  return res.json()
}

// Dashboard for logged-in users
function Dashboard() {
  const { data: session } = useSession()
  const { data, isLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: fetchStats
  })
  const { data: prefs } = usePreferences()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const stats = data?.stats
  const cardStats = data?.cardStats
  const userName = session?.user?.name?.trim()

  const totalCards: number = cardStats?.total ?? 0
  const due: number = cardStats?.dueToday ?? 0
  const streak: number = stats?.currentStreak ?? 0
  const dailyGoal: number = prefs?.dailyGoal ?? stats?.dailyGoal ?? 20
  const dailyProgress: number = stats?.dailyProgress ?? 0
  const goalPct = dailyGoal > 0 ? (dailyProgress / dailyGoal) * 100 : 0

  const deckEmpty = totalCards === 0
  const hero = deckEmpty
    ? { href: "/upload", label: "Add your first cards", icon: Upload }
    : due > 0
    ? { href: "/review", label: `Review ${due} due`, icon: GraduationCap }
    : { href: "/review", label: "Nothing due · Review anyway", icon: GraduationCap }

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      {/* Hero: one primary CTA plus today's numbers */}
      <Card className="border-primary/30 bg-gradient-to-br from-orange-50 via-yellow-50 to-green-50 dark:from-orange-950/20 dark:via-yellow-950/10 dark:to-green-950/20">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome back{userName ? `, ${userName}` : ""}!
            </h1>
            <p className="text-muted-foreground text-sm">
              {deckEmpty
                ? "Paste your class notes and you'll have flashcards in under a minute."
                : due > 0
                ? `${due} ${due === 1 ? "card is" : "cards are"} ready for review.`
                : "You're all caught up for now."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Link href={hero.href} className="sm:shrink-0">
              <Button size="lg" className="w-full sm:w-auto gap-2 text-base">
                <hero.icon className="h-5 w-5" />
                {hero.label}
              </Button>
            </Link>
            {!deckEmpty && (
              <Link href="/upload" className="sm:shrink-0">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2">
                  <Upload className="h-5 w-5" />
                  Upload notes
                </Button>
              </Link>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5 font-medium" title="Day streak">
              <Flame className="h-4 w-4 text-red-500" />
              {streak}-day streak
            </span>
            <span className="flex items-center gap-2 flex-1 min-w-[160px]" title="Daily goal">
              <Target className="h-4 w-4 text-green-600" />
              <span className="whitespace-nowrap font-medium">
                {dailyProgress} / {dailyGoal} today
              </span>
              <ProgressBar value={goalPct} className="flex-1 max-w-[160px]" />
            </span>
            <span className="text-xs text-muted-foreground">
              {stats?.totalXp ?? 0} XP · Level {stats?.level ?? 1}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Continue learning — in-progress courses and lessons */}
      <ContinueLearning />

      {/* Quick Links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/lessons">
          <Card className="hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Learn</p>
                <p className="text-sm text-muted-foreground">Lessons, courses & stories</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/deck">
          <Card className="hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <Layers className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">My Deck</p>
                <p className="text-sm text-muted-foreground">{totalCards} cards · browse & edit</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stats">
          <Card className="hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Full stats</p>
                <p className="text-sm text-muted-foreground">Achievements & history</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  )
}

// Marketing page for logged-out users
function MarketingPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <p className="text-6xl mb-6 opacity-80">
            芒果林
          </p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Learn Mandarin the way
            <span className="text-primary"> your brain actually works</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your class notes. AI turns them into flashcards, interactive lessons,
            and short stories — then drills them into long-term memory with spaced repetition.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">How it works</h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { step: "1", icon: Upload, title: "Upload Notes", desc: "Paste your lesson notes or vocabulary list" },
              { step: "2", icon: Brain, title: "AI Parses", desc: "Cards are created with pinyin, types, and tags" },
              { step: "3", icon: GraduationCap, title: "Study", desc: "Review with flashcards, quizzes, or stories" },
              { step: "4", icon: Target, title: "Remember", desc: "Spaced repetition schedules optimal review times" },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <p className="font-semibold mb-1">{title}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-orange-50/30 via-white to-green-50/30 dark:from-orange-950/10 dark:via-background dark:to-green-950/10">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            More than flashcards
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Six ways to study, all powered by AI and adapted to your vocabulary
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Upload className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Smart Note Parsing</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Paste lesson notes in any format — AI extracts vocabulary, grammar,
                  and phrases into structured flashcards with pinyin and tags.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Headphones className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Immersion & Listening Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Train without the pinyin crutch. Audio-only cards force you to
                  connect sound directly to characters. Tap to reveal pinyin only when stuck.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <PenLine className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Recall & Test Modes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Type answers from memory for active recall, or choose from
                  AI-generated multiple choice questions. Four review modes total.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI Short Stories</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Read AI-generated stories built from words you actually know.
                  Sentence-by-sentence audio with tap-to-reveal translations.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <GraduationCap className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Interactive Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  AI generates multi-page lessons with explanations, quizzes,
                  fill-in-the-blank, and translation exercises — all feeding back into SRS.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Puzzle className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Character Decomposition</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  See how characters are built from radicals and components.
                  Understand why characters look the way they do.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social proof / stats teaser */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center">
            <div>
              <p className="text-3xl font-bold text-primary">4</p>
              <p className="text-sm text-muted-foreground">Review modes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">SM-2</p>
              <p className="text-sm text-muted-foreground">Spaced repetition</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">AI</p>
              <p className="text-sm text-muted-foreground">Powered by Claude</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">Free</p>
              <p className="text-sm text-muted-foreground">No credit card</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <p className="text-4xl mb-4">
            开始学习
          </p>
          <h2 className="text-3xl font-bold mb-4">
            Start learning today
          </h2>
          <p className="text-muted-foreground mb-8">
            Upload your first set of notes and have flashcards in under a minute.
          </p>
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Create Your Account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}

export default function HomePage() {
  const { data: session, status } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-yellow-50/20 to-green-50/30 dark:from-orange-950/10 dark:via-yellow-950/5 dark:to-green-950/10">
      <Navbar />

      {status === "loading" ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : session ? (
        <div className="pb-24 md:pb-0">
          <Dashboard />
        </div>
      ) : (
        <MarketingPage />
      )}

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>Mangolin 芒果林 &mdash; AI-powered Mandarin learning</p>
          <p>Built with Next.js &amp; Claude</p>
        </div>
      </footer>

      {session && <BottomTabBar />}
    </div>
  )
}
