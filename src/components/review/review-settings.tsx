"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tags, BookOpen, Flame, Target, ChevronDown, Settings2, Play } from "lucide-react"
import type { ReviewMode, FaceMode, TestDirection } from "@/types"
import { useLessons } from "@/hooks/use-lessons"
import { REVIEW_DEFAULTS } from "@/lib/constants/review"

interface Tag {
  id: string
  name: string
}

interface ReviewData {
  /** Due + new cards matching the filter */
  dueCount: number
  totalCards: number
  /** Cards in the session that are due for review (previously seen) */
  dueInSession: number
  /** Cards in the session that are brand new */
  newInSession: number
  /** Total cards the session will contain */
  sessionSize: number
}

interface StartStats {
  currentStreak: number
  dailyGoal: number
  dailyProgress: number
}

interface ReviewSettingsProps {
  reviewMode: ReviewMode
  onReviewModeChange: (mode: ReviewMode) => void
  testDirection: TestDirection
  onTestDirectionChange: (direction: TestDirection) => void
  faceMode: FaceMode
  onFaceModeChange: (mode: FaceMode) => void
  cardLimit: string
  onCardLimitChange: (limit: string) => void
  allCards: boolean
  onAllCardsChange: (allCards: boolean) => void
  selectedTypes: string[]
  onSelectedTypesChange: (types: string[]) => void
  selectedTags: string[]
  onSelectedTagsChange: (tags: string[]) => void
  selectedLesson: string
  onSelectedLessonChange: (lessonId: string) => void
  newLimit: number
  onNewLimitChange: (n: number) => void
  showHardButton: boolean
  onShowHardButtonChange: (v: boolean) => void
  autoPlayAudio: boolean
  onAutoPlayAudioChange: (v: boolean) => void
  availableTags: Tag[]
  reviewData: ReviewData | null
  stats: StartStats | null
  isLoading: boolean
  onStart: () => void
}

const CARD_TYPES = ["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"]

const MODE_LABELS: Record<ReviewMode, string> = {
  classic: "Classic",
  recall: "Recall",
  listening: "Listening",
  test_easy: "Test"
}

const FACE_LABELS: Record<FaceMode, string> = {
  hanzi: "Hanzi front",
  pinyin: "Pinyin front",
  both: "Hanzi + pinyin front",
  english: "English front",
  immersion: "Immersion",
  random: "Random front"
}

const DIRECTION_LABELS: Record<TestDirection, string> = {
  HANZI_TO_MEANING: "Chinese → Meaning",
  MEANING_TO_HANZI: "Meaning → Chinese",
  PINYIN_TO_HANZI: "Pinyin → Chinese"
}

export function ReviewSettings({
  reviewMode,
  onReviewModeChange,
  testDirection,
  onTestDirectionChange,
  faceMode,
  onFaceModeChange,
  cardLimit,
  onCardLimitChange,
  allCards,
  onAllCardsChange,
  selectedTypes,
  onSelectedTypesChange,
  selectedTags,
  onSelectedTagsChange,
  selectedLesson,
  onSelectedLessonChange,
  newLimit,
  onNewLimitChange,
  showHardButton,
  onShowHardButtonChange,
  autoPlayAudio,
  onAutoPlayAudioChange,
  availableTags,
  reviewData,
  stats,
  isLoading,
  onStart
}: ReviewSettingsProps) {
  const { data: lessons } = useLessons()
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const lessonList = Array.isArray(lessons) ? lessons : []
  const currentLesson = selectedLesson !== "all" ? lessonList.find((l) => l.id === selectedLesson) : null

  const sessionSize = reviewData?.sessionSize ?? 0
  const nothingToReview = !isLoading && reviewData !== null && sessionSize === 0

  // One-line summary of the current settings
  const summaryParts = [MODE_LABELS[reviewMode]]
  if (reviewMode === "test_easy") summaryParts.push(DIRECTION_LABELS[testDirection])
  else if (reviewMode === "classic" || reviewMode === "recall") summaryParts.push(FACE_LABELS[faceMode])
  summaryParts.push(`${cardLimit || REVIEW_DEFAULTS.DEFAULT_CARD_LIMIT} cards`)
  if (allCards) summaryParts.push("all cards")
  if (currentLesson) summaryParts.push(`Lesson ${currentLesson.number}`)
  const filterCount = selectedTypes.length + selectedTags.length
  if (filterCount > 0) summaryParts.push(`${filterCount} filter${filterCount === 1 ? "" : "s"}`)

  const remainingForGoal = stats ? Math.max(0, stats.dailyGoal - stats.dailyProgress) : null
  const goalPct = stats && stats.dailyGoal > 0
    ? Math.min(100, Math.round((stats.dailyProgress / stats.dailyGoal) * 100))
    : 0

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold">Review</h1>
        {stats && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                {stats.currentStreak} day streak
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4 text-primary" />
                {remainingForGoal === 0
                  ? "Daily goal reached"
                  : `${remainingForGoal} more to hit today's goal`}
              </span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${goalPct}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Primary action */}
      <div className="space-y-2">
        <Button
          className="w-full h-14 text-lg"
          onClick={onStart}
          disabled={isLoading || nothingToReview}
        >
          <Play className="h-5 w-5 mr-2" />
          {isLoading
            ? "Loading..."
            : nothingToReview
              ? "Nothing to review"
              : allCards
                ? `Review ${sessionSize} cards`
                : `Review ${sessionSize} due`}
        </Button>
        {reviewData && !isLoading && (
          <p className="text-xs text-center text-muted-foreground">
            {allCards ? (
              <>{reviewData.totalCards} cards match your filters</>
            ) : sessionSize > 0 ? (
              <>
                {reviewData.dueInSession} due
                {reviewData.newInSession > 0 && <> + up to {reviewData.newInSession} new</>}
                {reviewData.dueCount > sessionSize && <> · {reviewData.dueCount} waiting in total</>}
              </>
            ) : (
              <>No cards are due right now</>
            )}
          </p>
        )}
        {nothingToReview && !allCards && reviewData && reviewData.totalCards > 0 && (
          <Button variant="outline" className="w-full" onClick={() => onAllCardsChange(true)}>
            Review anyway (include cards that aren&apos;t due)
          </Button>
        )}
      </div>

      {/* Settings summary + customize */}
      <Collapsible open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 p-4 text-left"
              aria-expanded={customizeOpen}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  Customize
                </p>
                <p className="text-xs text-muted-foreground truncate">{summaryParts.join(" · ")}</p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${customizeOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2">
                <Label>Review Mode</Label>
                <Select
                  value={reviewMode}
                  onValueChange={(v) => onReviewModeChange(v as ReviewMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Classic (Flip & Rate)</SelectItem>
                    <SelectItem value="recall">Recall (Type Answer)</SelectItem>
                    <SelectItem value="listening">Listening (Audio Only)</SelectItem>
                    <SelectItem value="test_easy">Test (Multiple Choice)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reviewMode === "test_easy" && (
                <div className="space-y-2">
                  <Label>Test Direction</Label>
                  <Select
                    value={testDirection}
                    onValueChange={(v) => onTestDirectionChange(v as TestDirection)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HANZI_TO_MEANING">Chinese → Meaning</SelectItem>
                      <SelectItem value="MEANING_TO_HANZI">Meaning → Chinese</SelectItem>
                      <SelectItem value="PINYIN_TO_HANZI">Pinyin → Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(reviewMode === "classic" || reviewMode === "recall") && (
                <div className="space-y-2">
                  <Label>Card Face Display</Label>
                  <Select
                    value={faceMode}
                    onValueChange={(v) => onFaceModeChange(v as FaceMode)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hanzi">Hanzi Only</SelectItem>
                      <SelectItem value="pinyin">Pinyin Only</SelectItem>
                      <SelectItem value="both">Hanzi + Pinyin</SelectItem>
                      <SelectItem value="english">English Only</SelectItem>
                      <SelectItem value="immersion">Immersion (Hanzi + Audio, No Pinyin)</SelectItem>
                      <SelectItem value="random">Random</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {lessonList.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Filter by Lesson
                  </Label>
                  <Select value={selectedLesson} onValueChange={onSelectedLessonChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All lessons" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lessons</SelectItem>
                      {lessonList.map((lesson) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          Lesson {lesson.number}
                          {lesson.title && `: ${lesson.title}`}
                          {lesson._count && ` (${lesson._count.cards} cards)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cards per session</Label>
                  <Input
                    type="number"
                    value={cardLimit}
                    onChange={(e) => onCardLimitChange(e.target.value)}
                    min={REVIEW_DEFAULTS.MIN_CARD_LIMIT}
                    max={REVIEW_DEFAULTS.MAX_CARD_LIMIT}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New cards max</Label>
                  <Input
                    type="number"
                    value={newLimit}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      onNewLimitChange(
                        Number.isNaN(n)
                          ? 0
                          : Math.min(REVIEW_DEFAULTS.MAX_NEW_CARDS_PER_SESSION, Math.max(0, n))
                      )
                    }}
                    min={0}
                    max={REVIEW_DEFAULTS.MAX_NEW_CARDS_PER_SESSION}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="all-cards">Include All Cards</Label>
                  <p className="text-xs text-muted-foreground">Review cards even if not due</p>
                </div>
                <Switch id="all-cards" checked={allCards} onCheckedChange={onAllCardsChange} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-hard">Show Hard button</Label>
                  <p className="text-xs text-muted-foreground">Four ratings instead of three on mobile</p>
                </div>
                <Switch id="show-hard" checked={showHardButton} onCheckedChange={onShowHardButtonChange} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-audio">Auto-play audio</Label>
                  <p className="text-xs text-muted-foreground">Never plays when the front is English</p>
                </div>
                <Switch id="auto-audio" checked={autoPlayAudio} onCheckedChange={onAutoPlayAudioChange} />
              </div>

              <div className="space-y-2">
                <Label>Filter by Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CARD_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onSelectedTypesChange([...selectedTypes, type])
                          } else {
                            onSelectedTypesChange(selectedTypes.filter((t) => t !== type))
                          }
                        }}
                      />
                      <label htmlFor={`type-${type}`} className="text-sm cursor-pointer capitalize">
                        {type.toLowerCase()}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedTypes.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectedTypesChange([])}
                    className="text-xs"
                  >
                    Clear type filter
                  </Button>
                )}
              </div>

              {availableTags.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Tags className="h-4 w-4" />
                    Filter by Tags
                  </Label>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                    {availableTags.map((tag) => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={selectedTags.includes(tag.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onSelectedTagsChange([...selectedTags, tag.id])
                            } else {
                              onSelectedTagsChange(selectedTags.filter((id) => id !== tag.id))
                            }
                          }}
                        />
                        <label htmlFor={`tag-${tag.id}`} className="text-sm cursor-pointer">
                          {tag.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectedTagsChange([])}
                      className="text-xs"
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}
