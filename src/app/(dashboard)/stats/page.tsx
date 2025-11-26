"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Flame,
  Star,
  Trophy,
  Zap,
  Target,
  TrendingUp,
  BookOpen,
  CheckCircle,
  Clock,
  Award
} from "lucide-react"

// Progress bar component
function ProgressBar({
  value,
  className,
  showLabel
}: {
  value: number
  className?: string
  showLabel?: boolean
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 transition-all shadow-sm"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
      {showLabel && (
        <span className="absolute right-0 -top-5 text-xs font-medium text-muted-foreground">
          {Math.round(value)}%
        </span>
      )}
    </div>
  )
}

// Fetch stats from API
async function fetchStats() {
  const res = await fetch("/api/stats")
  if (!res.ok) throw new Error("Failed to fetch stats")
  return res.json()
}

// Icon mapping for achievements
const iconMap: Record<string, React.ReactNode> = {
  Star: <Star className="h-5 w-5" />,
  Zap: <Zap className="h-5 w-5" />,
  Award: <Award className="h-5 w-5" />,
  Trophy: <Trophy className="h-5 w-5" />,
  Crown: <Trophy className="h-5 w-5" />,
  Flame: <Flame className="h-5 w-5" />,
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  Target: <Target className="h-5 w-5" />,
  Coins: <Zap className="h-5 w-5" />,
  Gem: <Star className="h-5 w-5" />
}

export default function StatsPage() {
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

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load stats</p>
      </div>
    )
  }

  const { stats, achievements, allAchievements, cardStats, dailyReviews, qualityCounts, accuracy, cardReviewStats } = data

  // Generate last 30 days for heatmap
  const last30Days = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    last30Days.push({
      date: dateStr,
      count: dailyReviews[dateStr] || 0,
      dayOfWeek: date.getDay()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Stats</h1>
        <p className="text-muted-foreground">
          Track your learning progress and achievements
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-900/30">
          <CardContent className="p-4 text-center">
            <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalXp}</p>
            <p className="text-sm text-muted-foreground">Total XP</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-900/30">
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 text-orange-600 dark:text-orange-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.level}</p>
            <p className="text-sm text-muted-foreground">Level</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-900/30">
          <CardContent className="p-4 text-center">
            <Flame className="h-8 w-8 text-red-600 dark:text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.currentStreak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-yellow-50 dark:from-green-950/20 dark:to-yellow-950/20 border-green-200 dark:border-green-900/30">
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 text-green-600 dark:text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.longestStreak}</p>
            <p className="text-sm text-muted-foreground">Best Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Level Progress</CardTitle>
          <CardDescription>
            {stats.xpProgress.current} / {stats.xpProgress.needed} XP to Level {stats.level + 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressBar value={stats.xpProgress.percentage} showLabel />
        </CardContent>
      </Card>

      {/* Daily Goal */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Daily Goal</CardTitle>
          <CardDescription>
            {stats.dailyProgress} / {stats.dailyGoal} cards reviewed today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgressBar
            value={(stats.dailyProgress / stats.dailyGoal) * 100}
            showLabel
          />
        </CardContent>
      </Card>

      {/* Card States */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Spaced Repetition Status</CardTitle>
          <CardDescription>
            {cardStats.total} total cards tracked by the learning algorithm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg" title="Never reviewed before">
                <BookOpen className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{cardStats.new}</p>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg" title="In initial learning phase (short intervals)">
                <Clock className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{cardStats.learning}</p>
                <p className="text-xs text-muted-foreground">Learning</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg" title="Being reviewed at medium intervals">
                <TrendingUp className="h-5 w-5 text-orange-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{cardStats.review}</p>
                <p className="text-xs text-muted-foreground">Review</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg" title="Successfully learned (long intervals)">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{cardStats.learned}</p>
                <p className="text-xs text-muted-foreground">Learned</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg" title="Cards ready to review today">
                <Target className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{cardStats.dueToday}</p>
                <p className="text-xs text-muted-foreground">Due</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
              Cards progress through stages as you review them successfully
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Review Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Learning Progress</CardTitle>
          <CardDescription>
            {cardStats.total} cards in your deck
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Accuracy percentage */}
            <div className="text-center">
              <div className="text-5xl font-bold text-primary mb-2">{accuracy}%</div>
              <p className="text-sm text-muted-foreground">Success Rate (last 100 reviews)</p>
            </div>

            {/* Card-based breakdown */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg text-center border border-green-200 dark:border-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  {cardReviewStats.successful}
                </p>
                <p className="text-xs text-muted-foreground">Successful</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg text-center border border-red-200 dark:border-red-900/30">
                <Target className="h-5 w-5 text-red-600 dark:text-red-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-red-700 dark:text-red-400">
                  {cardReviewStats.needsPractice}
                </p>
                <p className="text-xs text-muted-foreground">Needs Practice</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg text-center border border-gray-200 dark:border-gray-900/30">
                <BookOpen className="h-5 w-5 text-gray-600 dark:text-gray-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-700 dark:text-gray-400">
                  {cardReviewStats.notReviewedYet}
                </p>
                <p className="text-xs text-muted-foreground">Not Reviewed Yet</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2 border-t">
              Cards grouped by their last review result across all review types
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {last30Days.map((day) => (
              <div
                key={day.date}
                className={`w-4 h-4 rounded-sm ${
                  day.count === 0
                    ? "bg-gray-100"
                    : day.count < 5
                    ? "bg-green-200"
                    : day.count < 15
                    ? "bg-green-400"
                    : day.count < 30
                    ? "bg-green-500"
                    : "bg-green-700"
                }`}
                title={`${day.date}: ${day.count} reviews`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="w-3 h-3 rounded-sm bg-gray-100" />
            <div className="w-3 h-3 rounded-sm bg-green-200" />
            <div className="w-3 h-3 rounded-sm bg-green-400" />
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <div className="w-3 h-3 rounded-sm bg-green-700" />
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Achievements</CardTitle>
          <CardDescription>
            {achievements.length} / {allAchievements.length} unlocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allAchievements.map((achievement: {
              id: string
              key: string
              name: string
              description: string
              icon: string
              xpReward: number
            }) => {
              const unlocked = achievements.find(
                (a: { id: string }) => a.id === achievement.id
              )
              return (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-lg border ${
                    unlocked
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-gray-50 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={unlocked ? "text-yellow-500" : "text-gray-400"}
                    >
                      {iconMap[achievement.icon] || <Star className="h-5 w-5" />}
                    </span>
                    <span className="font-medium text-sm">{achievement.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {achievement.description}
                  </p>
                  {achievement.xpReward > 0 && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      +{achievement.xpReward} XP
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
