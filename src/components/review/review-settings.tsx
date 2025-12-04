import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tags, BookOpen } from "lucide-react"
import type { ReviewMode, FaceMode, TestDirection } from "@/types"
import { useLessons, type LessonWithCount } from "@/hooks/use-lessons"

interface Tag {
  id: string
  name: string
}

interface ReviewData {
  dueCount: number
  totalCards: number
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
  availableTags: Tag[]
  reviewData: ReviewData | null
  isLoading: boolean
  onStart: () => void
}

const CARD_TYPES = ["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"]

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
  availableTags,
  reviewData,
  isLoading,
  onStart
}: ReviewSettingsProps) {
  const { data: lessons, isLoading: lessonsLoading } = useLessons()
  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Session</h1>
        <p className="text-muted-foreground">
          Configure your review settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <SelectItem value="classic">Classic (Self-Rating)</SelectItem>
                <SelectItem value="test_easy">Test Mode (Multiple Choice)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reviewMode !== "classic" && (
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

          {reviewMode === "classic" && (
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
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {lessons && Array.isArray(lessons) && lessons.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Filter by Lesson
              </Label>
              <Select
                value={selectedLesson}
                onValueChange={onSelectedLessonChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All lessons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Lessons</SelectItem>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id}>
                      Lesson {lesson.number}
                      {lesson.title && `: ${lesson.title}`}
                      {lesson._count && ` (${lesson._count.cards} cards)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLesson && selectedLesson !== "all" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectedLessonChange("all")}
                  className="text-xs"
                >
                  Clear lesson filter
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Number of Cards</Label>
            <Input
              type="number"
              value={cardLimit}
              onChange={(e) => onCardLimitChange(e.target.value)}
              min="1"
              max="100"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="all-cards">Include All Cards</Label>
              <p className="text-xs text-muted-foreground">
                Review cards even if not due
              </p>
            </div>
            <Switch
              id="all-cards"
              checked={allCards}
              onCheckedChange={onAllCardsChange}
            />
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
                  <label
                    htmlFor={`type-${type}`}
                    className="text-sm cursor-pointer capitalize"
                  >
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
                    <label
                      htmlFor={`tag-${tag.id}`}
                      className="text-sm cursor-pointer"
                    >
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

          {reviewData && (
            <div className="text-sm text-muted-foreground text-center p-2 bg-muted rounded">
              {allCards ? (
                <span>{reviewData.totalCards} total cards available</span>
              ) : (
                <span>{reviewData.dueCount} cards due for review</span>
              )}
            </div>
          )}

          <Button
            className="w-full"
            onClick={onStart}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Start Review"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
