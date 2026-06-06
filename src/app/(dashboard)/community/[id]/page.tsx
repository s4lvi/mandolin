"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { useCommunityLessonDetail, useAddCommunityLesson, type CommunityLessonCard } from "@/hooks/use-community"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, Users, Loader2, Volume2 } from "lucide-react"
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
    <div className="max-w-2xl mx-auto space-y-6">
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

      {/* Card preview */}
      <div>
        <h2 className="text-lg font-medium mb-3">Cards ({lesson.cards.length})</h2>
        <div className="space-y-2">
          {lesson.cards.map((card: CommunityLessonCard, i: number) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => speakChinese(card.hanzi)}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{card.hanzi}</span>
                    <span className="text-sm text-muted-foreground">{card.pinyin}</span>
                  </div>
                  <p className="text-sm">{card.english}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {card.type.toLowerCase()}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
