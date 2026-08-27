"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { CardItem } from "@/components/cards/card-item"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  ArrowLeft,
  Play,
  BarChart3,
  FileText,
  CheckCircle,
  ChevronDown,
  Share2,
  Loader2,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react"
import { formatLessonTitle, lessonSourceLabel } from "@/lib/lesson-helpers"
import { useUnpublishLesson } from "@/hooks/use-community"
import { useRemoveCardsFromLesson, useLessons, useRegenerateLessonPages } from "@/hooks/use-lessons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { PublishLessonDialog } from "@/components/lessons/publish-lesson-dialog"
import { EditLessonDialog } from "@/components/lessons/edit-lesson-dialog"
import { DeleteLessonDialog } from "@/components/lessons/delete-lesson-dialog"
import { CardLessonsDialog } from "@/components/lessons/card-lessons-dialog"
import { AddCardsToLessonDialog } from "@/components/lessons/add-cards-to-lesson-dialog"
import { toast } from "sonner"
import type { Card as CardType } from "@/types"

interface LessonProgress {
  currentPage: number
  totalPages: number
  completedAt: string | null
  isComplete: boolean
}

interface LessonDetail {
  id: string
  number: number
  title?: string
  date?: string
  notes?: string
  sourceType?: string
  pagesStale?: boolean
  deckId: string
  createdAt: string
  cards: CardType[]
  lessonProgress: LessonProgress | null
  publishedLesson?: { id: string; title: string; addCount: number } | null
  _count?: { pages: number }
}

class LessonNotFoundError extends Error {
  constructor() {
    super("Lesson not found")
    this.name = "LessonNotFoundError"
  }
}

async function fetchLessonDetail(id: string): Promise<LessonDetail> {
  const res = await fetch(`/api/lessons/${id}`)
  if (res.status === 404) {
    throw new LessonNotFoundError()
  }
  if (!res.ok) {
    throw new Error("Failed to fetch lesson")
  }
  return res.json()
}

export default function LessonDetailPage() {
  const params = useParams()
  const router = useRouter()
  const lessonId = params.id as string
  const [notesOpen, setNotesOpen] = useState(false)
  const [showPublish, setShowPublish] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAddCards, setShowAddCards] = useState(false)
  const [showUnpublish, setShowUnpublish] = useState(false)
  const [manageCard, setManageCard] = useState<CardType | null>(null)
  const unpublishMutation = useUnpublishLesson()
  const removeFromLesson = useRemoveCardsFromLesson()
  const regenerateMutation = useRegenerateLessonPages()
  const { data: allLessons } = useLessons()

  const handleRegenerate = async () => {
    try {
      await regenerateMutation.mutateAsync(lessonId)
      toast.success("Lesson regenerated with the current cards")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to regenerate lesson")
    }
  }

  const handleRemoveFromLesson = async (cardId: string) => {
    try {
      await removeFromLesson.mutateAsync({ lessonId, cardIds: [cardId] })
      toast.success("Removed from this lesson")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove card")
    }
  }

  const handleUnpublish = async () => {
    try {
      await unpublishMutation.mutateAsync(lessonId)
      toast.success("Lesson removed from the community")
      setShowUnpublish(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unpublish")
    }
  }

  const { data: lesson, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => fetchLessonDetail(lessonId),
    enabled: !!lessonId,
    // Don't retry a definitive 404; retry transient failures as usual
    retry: (failureCount, err) =>
      !(err instanceof LessonNotFoundError) && failureCount < 3
  })

  if (error instanceof LessonNotFoundError) {
    return (
      <ErrorBoundary>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">Lesson not found</h3>
          <p className="text-muted-foreground mb-4">
            The lesson you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Link href="/lessons">
            <Button variant="outline">Back to Lessons</Button>
          </Link>
        </div>
      </ErrorBoundary>
    )
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="text-center py-12" role="alert">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-2">Couldn&apos;t load this lesson</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Retry
            </Button>
            <Link href="/lessons">
              <Button variant="outline">Back to Lessons</Button>
            </Link>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading lesson...</p>
        </div>
      </ErrorBoundary>
    )
  }

  if (!lesson) {
    return null
  }

  const lessonProgress = lesson.lessonProgress
  const isComplete = lessonProgress?.isComplete
  const progressPercent = lessonProgress
    ? Math.round((lessonProgress.currentPage / lessonProgress.totalPages) * 100)
    : 0

  const getStatusLabel = () => {
    if (isComplete) return "Completed"
    if (lessonProgress) return "In Progress"
    return "Not Started"
  }

  const sourceLabel = lessonSourceLabel(lesson)
  const hasPages = (lesson._count?.pages ?? 0) > 0
  const showStaleBanner = hasPages && !!lesson.pagesStale
  const editFrom = `/lessons/${lesson.id}`

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex flex-wrap items-center gap-2">
                {formatLessonTitle(lesson.number, lesson.title)}
                {sourceLabel && (
                  <Badge variant="outline" className="text-xs font-medium align-middle">
                    {sourceLabel}
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground">
                {lesson.cards.length} cards • {getStatusLabel()}
                {lesson.date && ` • ${new Date(lesson.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowEdit(true)} title="Rename lesson">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDelete(true)}
              title="Delete lesson"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            {/* Publish button for any lesson with cards that isn't already published */}
            {!lesson.publishedLesson && lesson.cards.length > 0 && (
              <Button variant="outline" onClick={() => setShowPublish(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Publish
              </Button>
            )}
            {lesson.publishedLesson && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="h-8 flex items-center gap-1">
                  <Share2 className="h-3 w-3" />
                  Published ({lesson.publishedLesson.addCount} added)
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUnpublish(true)}
                  disabled={unpublishMutation.isPending}
                >
                  Unpublish
                </Button>
              </div>
            )}
            <Link href={`/lessons/${lesson.id}/learn`}>
              <Button>
                <Play className="h-4 w-4 mr-2" />
                {isComplete ? "Review Lesson" : lessonProgress ? "Continue" : "Start Lesson"}
              </Button>
            </Link>
          </div>
        </div>

        {showStaleBanner && (
          <div
            role="status"
            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="flex-1">
              Cards changed since this lesson was generated. Regenerating rebuilds the
              exercises and restarts your progress.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate
            </Button>
          </div>
        )}

        {/* Progress Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Lesson Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isComplete ? (
              <div className="flex items-center gap-4">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-lg font-medium text-green-600 dark:text-green-400">
                    Lesson Completed!
                  </p>
                  {lessonProgress?.completedAt && (
                    <p className="text-sm text-muted-foreground">
                      Completed on {new Date(lessonProgress.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ) : lessonProgress ? (
              <div className="flex items-center gap-6">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                <div className="text-center px-4 py-2 bg-blue-50 dark:bg-blue-950/20 rounded flex-shrink-0">
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {lessonProgress.currentPage} / {lessonProgress.totalPages}
                  </div>
                  <div className="text-xs text-muted-foreground">pages</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    You haven&apos;t started this lesson yet
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lesson Context - Collapsible */}
        {lesson.notes && (
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Lesson Context
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                        notesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{lesson.notes}</ReactMarkdown>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Quick Actions (the Start/Continue action lives in the header) */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/review?lessonId=${lesson.id}`}>
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              Flashcard Review
            </Button>
          </Link>
          <Link href={`/deck?lessonId=${lesson.id}`}>
            <Button variant="outline">
              View All Cards
            </Button>
          </Link>
        </div>

        {/* Cards List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Cards in this lesson ({lesson.cards.length})
            </h2>
            <Button variant="outline" size="sm" onClick={() => setShowAddCards(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add cards
            </Button>
          </div>

          {lesson.cards.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  No cards in this lesson yet
                </p>
                <Button variant="outline" onClick={() => setShowAddCards(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add cards
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lesson.cards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  onTagClick={() => {}}
                  editFrom={editFrom}
                  onManageLessons={() => setManageCard(card)}
                  onRemoveFromLesson={() => handleRemoveFromLesson(card.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <PublishLessonDialog
        open={showPublish}
        onClose={() => setShowPublish(false)}
        lessonId={lesson.id}
        defaultTitle={formatLessonTitle(lesson.number, lesson.title)}
        cardCount={lesson.cards.length}
      />

      <EditLessonDialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        lessonId={lesson.id}
        initialNumber={lesson.number}
        initialTitle={lesson.title}
        initialNotes={lesson.notes}
        takenNumbers={(allLessons ?? []).filter((l) => l.id !== lesson.id).map((l) => l.number)}
      />

      <DeleteLessonDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        lessonId={lesson.id}
        lessonLabel={formatLessonTitle(lesson.number, lesson.title)}
        cardCount={lesson.cards.length}
        onDeleted={() => router.push("/lessons")}
      />

      <Dialog open={showUnpublish} onOpenChange={(o) => !o && !unpublishMutation.isPending && setShowUnpublish(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish this lesson?</DialogTitle>
            <DialogDescription>
              It will be removed from the community and other learners won&apos;t be able to
              find or add it. Copies people already added to their decks are unaffected.
              You can publish it again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnpublish(false)}
              disabled={unpublishMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={unpublishMutation.isPending}
            >
              {unpublishMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCardsToLessonDialog
        open={showAddCards}
        onClose={() => setShowAddCards(false)}
        lessonId={lesson.id}
        existingCardIds={lesson.cards.map((c) => c.id)}
      />

      {manageCard && (
        <CardLessonsDialog
          open={!!manageCard}
          onClose={() => setManageCard(null)}
          cardId={manageCard.id}
          cardLabel={manageCard.hanzi}
          currentLessonIds={(manageCard.lessons ?? []).map((l) => l.lessonId)}
        />
      )}
    </ErrorBoundary>
  )
}
