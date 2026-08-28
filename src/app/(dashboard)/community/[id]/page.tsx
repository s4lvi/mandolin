"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { useCommunityLessonDetail, useAddCommunityLesson, type CommunityLessonCard } from "@/hooks/use-community"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { ArrowLeft, Plus, Users, Loader2, Volume2, FileText, ChevronDown } from "lucide-react"
import { speakChinese } from "@/lib/speech"
import { toast } from "sonner"

export default function CommunityLessonDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const router = useRouter()
  const [contextOpen, setContextOpen] = useState(false)

  const { data: lesson, isLoading } = useCommunityLessonDetail(id)
  const addMutation = useAddCommunityLesson()

  if (isLoading || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleAdd = async () => {
    try {
      const result = await addMutation.mutateAsync(id)
      if (result.created > 0 && result.duplicates > 0) {
        toast.success(`Added ${result.created} cards (${result.duplicates} already in your deck)`)
      } else if (result.created > 0) {
        toast.success(`Added ${result.created} cards to your deck`)
      } else {
        toast.info("These cards are already in your deck")
      }
      router.push(`/lessons/${result.lessonId}`)
    } catch {
      toast.error("Failed to add lesson")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Button variant="ghost" size="sm" onClick={() => router.push("/community")}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">{lesson.title}</h1>
        {lesson.description && (
          <p className="text-muted-foreground mt-1">{lesson.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-sm text-muted-foreground">by {lesson.author}</span>
          <Badge variant="secondary">{lesson.cardCount} cards</Badge>
          {lesson.level && <Badge variant="outline">{lesson.level}</Badge>}
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {lesson.addCount} added
          </span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Adds a copy of this lesson&apos;s cards to your deck as a new lesson.
      </p>

      <Button
        className="w-full h-12"
        onClick={handleAdd}
        disabled={addMutation.isPending}
      >
        {addMutation.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 mr-2" />
        )}
        Add to My Deck
      </Button>

      {/* Lesson context — collapsed by default so it doesn't dominate */}
      {lesson.notes && lesson.notes.trim().length > 0 && (
        <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Lesson context
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${contextOpen ? "rotate-180" : ""}`}
                />
              </CardContent>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 px-4 pb-4">
                <div className="prose prose-sm dark:prose-invert max-w-none max-h-[50vh] overflow-y-auto">
                  <ReactMarkdown>{lesson.notes}</ReactMarkdown>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Card preview — condensed grid */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          {lesson.cards.length} cards
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lesson.cards.map((card: CommunityLessonCard, i: number) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5"
            >
              <button
                type="button"
                onClick={() => speakChinese(card.hanzi)}
                className="text-muted-foreground hover:text-foreground shrink-0 flex items-center justify-center h-11 w-11 -my-2.5 -ml-2.5 sm:h-8 sm:w-8 sm:-my-1 sm:-ml-1 rounded-md"
                aria-label="Play pronunciation"
              >
                <Volume2 className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold leading-tight">{card.hanzi}</span>
                  <span className="text-xs text-muted-foreground truncate">{card.pinyin}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{card.english}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
