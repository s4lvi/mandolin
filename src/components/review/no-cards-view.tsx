"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { BookOpen, CheckCircle2, GraduationCap, Upload } from "lucide-react"

interface NoCardsViewProps {
  /**
   * Whether the deck has any cards at all. When omitted, it is looked up from
   * the stats endpoint so existing call sites keep working unchanged.
   */
  hasCards?: boolean
  /** Start a session that ignores the due schedule. Only rendered when provided. */
  onReviewAnyway?: () => void
}

async function fetchDeckSize(): Promise<number> {
  const res = await fetch("/api/stats")
  if (!res.ok) return 0
  const data = await res.json()
  return Number(data?.cardStats?.total ?? 0)
}

export function NoCardsView({ hasCards, onReviewAnyway }: NoCardsViewProps = {}) {
  const { data: deckSize } = useQuery({
    queryKey: ["deck-size"],
    queryFn: fetchDeckSize,
    enabled: hasCards === undefined,
    staleTime: 60 * 1000
  })

  const deckHasCards = hasCards ?? (deckSize ?? 0) > 0

  if (deckHasCards) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Nothing due</h2>
        <p className="text-muted-foreground mb-6">
          You&apos;re caught up. Come back later, or keep the momentum going.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {onReviewAnyway && (
            <Button onClick={onReviewAnyway}>Review anyway</Button>
          )}
          <Link href="/lessons">
            <Button variant={onReviewAnyway ? "outline" : "default"} className="w-full sm:w-auto gap-2">
              <GraduationCap className="h-4 w-4" />
              Learn something new
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto text-center py-12">
      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">Your deck is empty</h2>
      <p className="text-muted-foreground mb-6">
        Add some cards first — paste your class notes or follow a course.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link href="/upload">
          <Button className="w-full sm:w-auto gap-2">
            <Upload className="h-4 w-4" />
            Upload notes
          </Button>
        </Link>
        <Link href="/courses">
          <Button variant="outline" className="w-full sm:w-auto gap-2">
            <GraduationCap className="h-4 w-4" />
            Start a course
          </Button>
        </Link>
      </div>
    </div>
  )
}
