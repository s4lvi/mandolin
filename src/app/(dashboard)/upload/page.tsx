"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useParseNotes } from "@/hooks/use-upload"
import { useLessons } from "@/hooks/use-lessons"
import { getNextLessonNumber } from "@/lib/lesson-helpers"
import { ErrorBoundaryWithRouter as ErrorBoundary } from "@/components/error-boundary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Upload, Check, X, Loader2, CheckCircle, Play, BookOpen, Layers } from "lucide-react"
import { AILoading } from "@/components/ui/ai-loading"
import { toast } from "sonner"
import type { ParsedCard, CardType } from "@/types"

interface ParsedCardWithDuplicate extends ParsedCard {
  isDuplicate: boolean
  selected: boolean
}

interface SaveResult {
  created: number
  associated: number
  lessonId?: string
  lessonLabel?: string
}

type Step = 1 | 2 | 3

function StepIndicator({ step }: { step: Step }) {
  const labels = ["Notes", "Review", "Done"]
  return (
    <div className="flex items-center gap-2 mt-3" aria-label={`Step ${step} of 3`}>
      {labels.map((label, i) => {
        const n = (i + 1) as Step
        const active = n === step
        const done = n < step
        return (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold ${
                  active || done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-3 w-3" /> : n}
              </div>
              <span className={`text-xs ${active ? "font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {n < 3 && <div className="h-px flex-1 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState("")
  const [lessonMode, setLessonMode] = useState<"new" | "existing" | "none">("new")
  // User-entered values; "" means "not edited yet" so defaults are derived below.
  const [selectedLessonInput, setSelectedLessonId] = useState("")
  const [lessonNumberInput, setLessonNumber] = useState("")
  const [lessonTitle, setLessonTitle] = useState("")
  const [parsedCards, setParsedCards] = useState<ParsedCardWithDuplicate[]>([])
  const [generatedLessonContext, setGeneratedLessonContext] = useState("")
  const [step, setStep] = useState<Step>(1)
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
  const [lessonNumberError, setLessonNumberError] = useState<string | null>(null)

  const { parseStatus, ...parseNotesMutation } = useParseNotes()
  const { data: lessons } = useLessons()

  // Warn user before navigating away during AI parsing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (parseNotesMutation.isPending) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [parseNotesMutation.isPending])

  // Derive defaults during render: next lesson number, and first lesson for "existing" mode
  const lessonNumber =
    lessonNumberInput || (lessons ? getNextLessonNumber(lessons).toString() : "")
  const selectedLessonId =
    selectedLessonInput ||
    (lessons && Array.isArray(lessons) && lessons.length > 0 ? lessons[0].id : "")

  const handleParse = async () => {
    if (!notes.trim()) {
      toast.error("Please enter some notes to parse")
      return
    }

    // Validate lesson selection
    if (lessonMode === "new" && !lessonNumber) {
      toast.error("Please enter a lesson number")
      return
    }
    if (lessonMode === "existing" && !selectedLessonId) {
      toast.error("Please select a lesson")
      return
    }

    try {
      const result = await parseNotesMutation.mutateAsync({
        notes,
        lessonNumber: lessonNumber ? parseInt(lessonNumber) : undefined,
        lessonTitle: lessonTitle || undefined,
        lessonMode,
        selectedLessonId: lessonMode === "existing" ? selectedLessonId : undefined
      })

      setParsedCards(
        result.cards.map((card) => ({
          ...card,
          selected: !card.isDuplicate  // Only select new cards, deselect duplicates
        }))
      )

      // Store generated lesson context
      if (result.lessonContext) {
        setGeneratedLessonContext(result.lessonContext)
      }

      setStep(2)

      if (result.duplicatesFound > 0 && lessonMode !== "none") {
        toast.info(
          `Found ${result.duplicatesFound} duplicate card(s) - will be associated with the lesson (not created again)`
        )
      } else if (result.duplicatesFound > 0) {
        toast.info(
          `Found ${result.duplicatesFound} duplicate card(s) - these already exist and won't be created again`
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to parse notes"
      )
    }
  }

  const toggleCard = (index: number) => {
    setParsedCards((cards) =>
      cards.map((card, i) =>
        i === index && !card.isDuplicate ? { ...card, selected: !card.selected } : card
      )
    )
  }

  const handleSaveCards = async () => {
    if (isSaving) return

    const newCards = parsedCards
      .filter((card) => card.selected && !card.isDuplicate)
      .map((card) => ({
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        english: card.english,
        notes: card.notes,
        type: card.type as CardType,
        tags: card.suggestedTags
      }))

    const duplicateHanzi = parsedCards
      .filter((card) => card.isDuplicate)
      .map((card) => card.hanzi)

    const totalToProcess = newCards.length + (lessonMode !== "none" ? duplicateHanzi.length : 0)

    if (totalToProcess === 0) {
      toast.error("No cards to save")
      return
    }

    setIsSaving(true)
    setLessonNumberError(null)

    try {
      const res = await fetch("/api/cards/save-parsed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cards: newCards,
          duplicateHanzi: lessonMode !== "none" ? duplicateHanzi : [],
          lessonMode,
          lessonNumber: lessonNumber ? parseInt(lessonNumber) : undefined,
          lessonTitle: lessonTitle || undefined,
          lessonContext: generatedLessonContext || undefined,
          existingLessonId: lessonMode === "existing" ? selectedLessonId : undefined
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 409) {
        // Duplicate lesson number — send the user back to fix the number
        const message = data.error || "Lesson number already in use. Choose a different number."
        setLessonNumberError(message)
        setStep(1)
        toast.error(message)
        return
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to save cards")
      }

      const result: SaveResult = {
        created: data.created ?? newCards.length,
        associated: data.associated ?? 0,
        lessonId: data.lessonId ?? undefined,
        lessonLabel:
          lessonMode === "new"
            ? `Lesson ${lessonNumber}${lessonTitle ? `: ${lessonTitle}` : ""}`
            : lessonMode === "existing"
              ? (() => {
                  const l = lessons?.find((x) => x.id === selectedLessonId)
                  return l ? `Lesson ${l.number}${l.title ? `: ${l.title}` : ""}` : "the lesson"
                })()
              : undefined
      }

      // Lists shown elsewhere are now out of date
      queryClient.invalidateQueries({ queryKey: ["cards"] })
      queryClient.invalidateQueries({ queryKey: ["lessons"] })
      if (result.lessonId) {
        queryClient.invalidateQueries({ queryKey: ["lesson", result.lessonId] })
      }

      setSaveResult(result)
      setStep(3)

      const savedLabel = `Saved ${result.created} card${result.created !== 1 ? "s" : ""}`
      toast.success(
        result.lessonLabel ? `${savedLabel} to ${result.lessonLabel}` : savedLabel,
        result.lessonId
          ? {
              action: {
                label: "View lesson",
                onClick: () => router.push(`/lessons/${result.lessonId}`)
              }
            }
          : undefined
      )
    } catch (error) {
      // Stay on the review step so nothing is lost
      toast.error(error instanceof Error ? error.message : "Failed to save cards", {
        description: "Your parsed cards are still here — try again.",
        duration: 8000
      })
    } finally {
      setIsSaving(false)
    }
  }

  const resetFlow = () => {
    setNotes("")
    setParsedCards([])
    setGeneratedLessonContext("")
    setSaveResult(null)
    setLessonNumberError(null)
    setLessonNumber("")
    setLessonTitle("")
    setStep(1)
  }

  const selectedNewCards = parsedCards.filter((c) => c.selected && !c.isDuplicate).length
  const duplicateCards = parsedCards.filter((c) => c.isDuplicate).length
  const totalNewCards = parsedCards.filter((c) => !c.isDuplicate).length

  if (step === 3 && saveResult) {
    const createdLabel = `${saveResult.created} card${saveResult.created !== 1 ? "s" : ""}`
    return (
      <ErrorBoundary>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Upload Lesson Notes</h1>
            <StepIndicator step={3} />
          </div>

          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <CheckCircle className="h-14 w-14 text-green-600 dark:text-green-400 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold">
                  Saved {createdLabel}
                  {saveResult.lessonLabel ? ` to ${saveResult.lessonLabel}` : ""}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {saveResult.associated > 0 &&
                    `${saveResult.associated} existing card${saveResult.associated !== 1 ? "s were" : " was"} linked to the lesson. `}
                  {saveResult.created > 0 && "New cards start in your review queue right away."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                {saveResult.lessonId ? (
                  <>
                    <Button onClick={() => router.push(`/review?lessonId=${saveResult.lessonId}`)}>
                      <Play className="h-4 w-4 mr-2" />
                      Review these cards now
                    </Button>
                    <Button variant="outline" onClick={() => router.push(`/lessons/${saveResult.lessonId}`)}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      View lesson
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => router.push("/review")}>
                      <Play className="h-4 w-4 mr-2" />
                      Review now
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/deck")}>
                      <Layers className="h-4 w-4 mr-2" />
                      View deck
                    </Button>
                  </>
                )}
                <Button variant="ghost" onClick={resetFlow}>
                  Upload more notes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </ErrorBoundary>
    )
  }

  if (step === 2) {
    const savingLabel = `Saving ${selectedNewCards} card${selectedNewCards !== 1 ? "s" : ""}…`
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Review Parsed Cards</h1>
            <p className="text-muted-foreground">
              {selectedNewCards} of {totalNewCards} new card{totalNewCards !== 1 ? "s" : ""} selected to save
              {duplicateCards > 0 && lessonMode !== "none" && ` • ${duplicateCards} already in deck will be linked to the lesson`}
            </p>
            <StepIndicator step={2} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} disabled={isSaving}>
              Back to Edit
            </Button>
            <Button
              onClick={handleSaveCards}
              disabled={isSaving || selectedNewCards === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {savingLabel}
                </>
              ) : (
                `Save ${selectedNewCards} card${selectedNewCards !== 1 ? "s" : ""}${duplicateCards > 0 && lessonMode !== "none" ? ` + link ${duplicateCards}` : ""}`
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {parsedCards.map((card, index) =>
            card.isDuplicate ? (
              <Card
                key={index}
                aria-disabled="true"
                className="bg-muted/60 border-dashed"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 pt-1">
                      <Check className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xl font-bold">{card.hanzi}</span>
                        <span className="text-sm text-muted-foreground">
                          {card.pinyin}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {lessonMode !== "none"
                            ? "Already in deck — will be linked"
                            : "Already in deck — skipped"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{card.english}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
            <Card
              key={index}
              role="checkbox"
              aria-checked={card.selected}
              tabIndex={0}
              className={`cursor-pointer transition-all ${
                card.selected ? "ring-2 ring-primary" : "opacity-70"
              }`}
              onClick={() => toggleCard(index)}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault()
                  toggleCard(index)
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 pt-1">
                    {card.selected ? (
                      <Check className="h-5 w-5 text-primary" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl font-bold">{card.hanzi}</span>
                      <span className="text-sm text-muted-foreground">
                        {card.pinyin}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{card.english}</p>
                    {card.notes && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {card.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {card.type.toLowerCase()}
                      </Badge>
                      {card.suggestedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )
          )}
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Upload Lesson Notes</h1>
        <p className="text-muted-foreground">
          Paste your lesson notes and let AI create flashcards automatically
        </p>
        <StepIndicator step={1} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Selection</CardTitle>
          <CardDescription>
            Choose whether to create a new lesson, add to an existing one, or just create cards without a lesson.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Lesson Mode</Label>
            <RadioGroup value={lessonMode} onValueChange={(value) => setLessonMode(value as "new" | "existing" | "none")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="font-normal cursor-pointer">
                  Create New Lesson
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="font-normal cursor-pointer">
                  Add to Existing Lesson
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-normal cursor-pointer">
                  No Lesson (Cards Only)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {lessonMode === "new" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lessonNumber">
                  Lesson Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lessonNumber"
                  type="number"
                  placeholder="e.g., 1"
                  value={lessonNumber}
                  onChange={(e) => {
                    setLessonNumber(e.target.value)
                    setLessonNumberError(null)
                  }}
                  aria-invalid={!!lessonNumberError}
                  aria-describedby={lessonNumberError ? "lessonNumber-error" : undefined}
                  className={lessonNumberError ? "border-destructive" : undefined}
                />
                {lessonNumberError && (
                  <p id="lessonNumber-error" className="text-xs text-destructive">
                    {lessonNumberError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lessonTitle">Lesson Title (Optional)</Label>
                <Input
                  id="lessonTitle"
                  placeholder="e.g., Greetings"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                />
              </div>
            </div>
          )}

          {lessonMode === "existing" && (
            <div className="space-y-2">
              <Label htmlFor="existingLesson">
                Select Lesson <span className="text-destructive">*</span>
              </Label>
              {lessons && Array.isArray(lessons) && lessons.length > 0 ? (
                <Select value={selectedLessonId} onValueChange={setSelectedLessonId}>
                  <SelectTrigger id="existingLesson">
                    <SelectValue placeholder="Choose a lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    {lessons.map((lesson) => (
                      <SelectItem key={lesson.id} value={lesson.id}>
                        Lesson {lesson.number}
                        {lesson.title && `: ${lesson.title}`}
                        {lesson._count && ` (${lesson._count.cards} cards)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No existing lessons. Create a new lesson instead.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            💡 Tip: When you parse notes with a lesson selected, AI will generate both flashcards and a lesson context summary for interactive lessons.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lesson Notes</CardTitle>
          <CardDescription>
            Paste your notes including vocabulary, grammar points, and phrases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Example:
Vocabulary:
- 在哪儿 (zài nǎr) - where
- 左边 (zuǒbian) - left side

Grammar:
1. 在 + place - indicates location
   Example: 银行在学校对面

Phrases:
- 请问，...在哪儿？- Excuse me, where is...?`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[180px] md:min-h-[300px] font-mono text-sm"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Separator />
          {parsedCards.length > 0 && !parseNotesMutation.isPending && (
            <Button variant="outline" className="w-full" onClick={() => setStep(2)}>
              Back to review ({parsedCards.length} parsed card{parsedCards.length !== 1 ? "s" : ""})
            </Button>
          )}
          {parseNotesMutation.isPending ? (
            <AILoading
              status={parseStatus}
              statusLabels={{
                generating_context: "Generating lesson context",
                parsing_cards: "Extracting flashcards from your notes",
                streaming: "AI is building your cards",
              }}
            />
          ) : (
          <Button
            onClick={handleParse}
            disabled={!notes.trim()}
            className="w-full"
          >
              <>
                <Upload className="h-4 w-4 mr-2" />
                Parse Notes
              </>
          </Button>
          )}
        </CardContent>
      </Card>
    </div>
    </ErrorBoundary>
  )
}
