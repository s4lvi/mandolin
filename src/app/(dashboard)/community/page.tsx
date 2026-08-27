"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useCommunityLessons, type CommunityLessonSummary } from "@/hooks/use-community"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Search, Users, BookOpen, Share2 } from "lucide-react"
import { StoryListSkeleton } from "@/components/ui/skeleton"
import { LearnTabs } from "@/components/layout/learn-tabs"

const LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"]
const ALL_LEVELS = "all"

export default function CommunityPage() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState<string>(ALL_LEVELS)
  const [sort, setSort] = useState<"popular" | "recent">("popular")
  const [page, setPage] = useState(1)

  // Debounce the search box so we don't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading } = useCommunityLessons({
    search,
    level: level === ALL_LEVELS ? undefined : level,
    sort,
    page
  })
  const lessons = data?.lessons || []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <LearnTabs />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Community Lessons</h1>
        <p className="text-muted-foreground">
          Browse lessons shared by other learners
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lessons..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={sort === "popular" ? "default" : "outline"}
            size="sm"
            onClick={() => { setSort("popular"); setPage(1) }}
          >
            Popular
          </Button>
          <Button
            variant={sort === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => { setSort("recent"); setPage(1) }}
          >
            Recent
          </Button>
        </div>

        <Select value={level} onValueChange={(v) => { setLevel(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LEVELS}>All levels</SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <StoryListSkeleton count={5} />
      ) : lessons.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No lessons found</h3>
          <p className="text-muted-foreground">
            {search || level !== ALL_LEVELS
              ? "Try a different search or filter"
              : "Be the first to publish a lesson!"}
          </p>
          {!search && level === ALL_LEVELS && (
            <Link href="/lessons" className="inline-block mt-4">
              <Button className="gap-2">
                <Share2 className="h-4 w-4" />
                Publish one of your lessons
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson: CommunityLessonSummary) => (
            <Link key={lesson.id} href={`/community/${lesson.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{lesson.title}</p>
                      {lesson.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {lesson.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          by {lesson.author}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {lesson.cardCount} cards
                        </Badge>
                        {lesson.level && (
                          <Badge variant="outline" className="text-xs">
                            {lesson.level}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {lesson.addCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground flex items-center">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
