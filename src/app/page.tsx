"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { BookOpen, Upload, Brain, Tags, Flame, Star, Zap, Target, GraduationCap, Layers } from "lucide-react"

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
  const { data, isLoading } = useQuery({
    queryKey: ["user-stats"],
    queryFn: fetchStats
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const stats = data?.stats
  const cardStats = data?.cardStats

  return (
    <main className="container mx-auto px-4 py-8 space-y-6">
      {/* Welcome and Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">
            {cardStats?.dueToday || 0} cards due for review
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/review">
            <Button size="lg" className="gap-2">
              <GraduationCap className="h-5 w-5" />
              Review Now
            </Button>
          </Link>
          <Link href="/upload">
            <Button variant="outline" size="lg" className="gap-2">
              <Upload className="h-5 w-5" />
              Upload Notes
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-900/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats?.totalXp || 0}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-900/30">
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 text-orange-600 dark:text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats?.level || 1}</p>
            <p className="text-xs text-muted-foreground">Level</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-900/30">
          <CardContent className="p-4 text-center">
            <Flame className="h-6 w-6 text-red-600 dark:text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{stats?.currentStreak || 0}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-950/20 dark:to-yellow-950/20 border-green-200 dark:border-green-900/30">
          <CardContent className="p-4 text-center">
            <Target className="h-6 w-6 text-green-600 dark:text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{cardStats?.learned || 0}</p>
            <p className="text-xs text-muted-foreground">Learned</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Progress */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Daily Goal</CardTitle>
            <CardDescription>
              {stats.dailyProgress} / {stats.dailyGoal} cards reviewed today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBar value={(stats.dailyProgress / stats.dailyGoal) * 100} />
          </CardContent>
        </Card>
      )}

      {/* Card Progress */}
      {cardStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Card Progress</CardTitle>
            <CardDescription>{cardStats.total} total cards in your deck</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 text-center text-sm">
              <div className="p-2 bg-blue-50 rounded">
                <p className="font-bold text-blue-600">{cardStats.new}</p>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
              <div className="p-2 bg-yellow-50 rounded">
                <p className="font-bold text-yellow-600">{cardStats.learning}</p>
                <p className="text-xs text-muted-foreground">Learning</p>
              </div>
              <div className="p-2 bg-orange-50 rounded">
                <p className="font-bold text-orange-600">{cardStats.review}</p>
                <p className="text-xs text-muted-foreground">Review</p>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <p className="font-bold text-green-600">{cardStats.learned}</p>
                <p className="text-xs text-muted-foreground">Learned</p>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <p className="font-bold text-purple-600">{cardStats.dueToday}</p>
                <p className="text-xs text-muted-foreground">Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/deck">
          <Card className="hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <Layers className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">My Deck</p>
                <p className="text-sm text-muted-foreground">Browse and edit cards</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/lessons">
          <Card className="hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Lessons</p>
                <p className="text-sm text-muted-foreground">View by lesson</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stats">
          <Card className="hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <Star className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">Full Stats</p>
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
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Master Mandarin with
            <span className="text-primary"> AI-Powered</span> Flashcards
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your lesson notes and let AI create personalized flashcards.
            Build your vocabulary systematically with smart review sessions.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-orange-50/20 via-white to-green-50/20">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to learn Mandarin
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <Upload className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Smart Note Parsing</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Upload your lesson notes and AI automatically creates flashcards
                  for vocabulary, grammar points, and phrases.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Flexible Review</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Choose how to study - show pinyin, hanzi, both, or English.
                  Track your progress with each card.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI Examples</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get AI-generated example sentences for grammar points
                  using vocabulary you already know.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Tags className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Organize by Lesson</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Cards are automatically tagged by lesson number and category.
                  Filter your deck to focus on specific topics.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Start building your Mandarin vocabulary today
          </h2>
          <p className="text-muted-foreground mb-8">
            Free to use. No credit card required.
          </p>
          <Link href="/signup">
            <Button size="lg">Create Your Account</Button>
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
        <Dashboard />
      ) : (
        <MarketingPage />
      )}

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Mangolin - Mandarin Flashcard Study Tool
        </div>
      </footer>
    </div>
  )
}
