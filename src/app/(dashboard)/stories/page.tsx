"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Volume2, BookOpen, Eye, EyeOff, Trash2, Clock, Upload, RotateCcw, Sparkles } from "lucide-react"
import { StoryListSkeleton } from "@/components/ui/skeleton"
import { AILoading } from "@/components/ui/ai-loading"
import { LearnTabs } from "@/components/layout/learn-tabs"
import { speakChinese } from "@/lib/speech"
import { useCards } from "@/hooks/use-cards"
import {
  useStories,
  useDeleteStory,
  useGenerateStory,
  STORY_STAGE_LABELS,
  type Story,
  type StorySentence
} from "@/hooks/use-stories"
import { SentenceDisplay } from "@/components/stories/sentence-display"
import { WordSheet } from "@/components/stories/word-sheet"
import type { StoryWordInfo } from "@/components/stories/story-words"
import { DEFAULT_STORY_PREFS, loadStoryPrefs, saveStoryPrefs, type StoryPrefs } from "@/components/stories/story-prefs"
import { toast } from "sonner"
import type { StoryDisplayMode } from "@/types"

const MIN_CARDS_FOR_STORY = 3

function ReadingModeToggle({
  displayMode,
  onChange
}: {
  displayMode: StoryDisplayMode
  onChange: (mode: StoryDisplayMode) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Reading mode:</span>
      <Button
        variant={displayMode === "hanzi_audio" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("hanzi_audio")}
      >
        <EyeOff className="h-3 w-3 mr-1" />
        Immersion
      </Button>
      <Button
        variant={displayMode === "hanzi_pinyin_audio" ? "default" : "outline"}
        size="sm"
        onClick={() => onChange("hanzi_pinyin_audio")}
      >
        <Eye className="h-3 w-3 mr-1" />
        With Pinyin
      </Button>
    </div>
  )
}

export default function StoriesPage() {
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [isPlayingAll, setIsPlayingAll] = useState(false)
  const [tappedWord, setTappedWord] = useState<StoryWordInfo | null>(null)

  // Reader preferences persisted in localStorage; restored after mount so the
  // server render and first client render agree.
  const [prefs, setPrefs] = useState<StoryPrefs>(DEFAULT_STORY_PREFS)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  useEffect(() => {
    setPrefs(loadStoryPrefs())
    setPrefsLoaded(true)
  }, [])
  useEffect(() => {
    if (prefsLoaded) saveStoryPrefs(prefs)
  }, [prefs, prefsLoaded])
  const displayMode = prefs.displayMode
  const setDisplayMode = (displayMode: StoryDisplayMode) => setPrefs((p) => ({ ...p, displayMode }))
  const setReadAloud = (readAloud: boolean) => setPrefs((p) => ({ ...p, readAloud }))

  const { data: savedStories = [], isLoading: isLoadingStories } = useStories()
  const { data: cards, isLoading: isLoadingCards } = useCards()
  const deleteStoryMutation = useDeleteStory()
  const { generate, isGenerating, stage } = useGenerateStory()

  const cardCount = cards?.length ?? 0
  const canGenerate = cardCount >= MIN_CARDS_FOR_STORY

  const generateStory = async () => {
    setActiveStory(null)
    try {
      const story = await generate()
      setActiveStory(story)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate story")
    }
  }

  const deleteStory = async (storyId: string) => {
    if (!window.confirm("Delete this story? This can't be undone.")) return
    try {
      await deleteStoryMutation.mutateAsync(storyId)
      if (activeStory?.id === storyId) setActiveStory(null)
      toast.success("Story deleted")
    } catch {
      toast.error("Failed to delete story")
    }
  }

  const playAllSentences = async () => {
    if (!activeStory || isPlayingAll) return
    setIsPlayingAll(true)

    for (const sentence of activeStory.sentences) {
      await new Promise<void>((resolve) => {
        speakChinese(
          sentence.hanzi,
          undefined,
          () => resolve(),
          () => resolve()
        )
      })
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    setIsPlayingAll(false)
  }

  // "Read Aloud" preference: auto-play the story when it opens.
  const activeStoryId = activeStory?.id
  useEffect(() => {
    if (!activeStoryId || !prefsLoaded || !prefs.readAloud) return
    void playAllSentences()
    // Only fire when a story is opened, not on every preference change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStoryId, prefsLoaded])

  // Reading view for an active story
  if (activeStory) {
    const newWordCount = activeStory.sentences.reduce((acc, s) => acc + (s.newWords?.length || 0), 0)
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{activeStory.title}</h1>
            {displayMode === "hanzi_pinyin_audio" && (
              <p className="text-muted-foreground">{activeStory.titlePinyin}</p>
            )}
            <p className="text-sm text-muted-foreground">{activeStory.titleEnglish}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={playAllSentences}
              disabled={isPlayingAll}
              className="min-h-[40px]"
            >
              <Volume2 className={`h-4 w-4 mr-1 ${isPlayingAll ? "animate-pulse" : ""}`} />
              {isPlayingAll ? "Playing..." : "Read Aloud"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[40px]"
              onClick={() => setActiveStory(null)}
            >
              Back
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <ReadingModeToggle displayMode={displayMode} onChange={setDisplayMode} />
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={prefs.readAloud}
              onChange={(e) => setReadAloud(e.target.checked)}
            />
            Read aloud when a story opens
          </label>
        </div>

        <p className="text-xs text-muted-foreground">
          Tap an underlined word to see its meaning or add it to your deck.
        </p>

        <Card>
          <CardContent className="py-4 divide-y">
            {activeStory.sentences.map((sentence, index) => (
              <SentenceDisplay
                key={index}
                sentence={sentence}
                displayMode={displayMode}
                cards={cards}
                onWordTap={setTappedWord}
              />
            ))}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          {activeStory.sentences.length} sentences
          {newWordCount > 0 && <> with {newWordCount} new words</>}
        </div>

        {/* End-of-story actions */}
        <Card>
          <CardContent className="py-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/review" className="w-full sm:w-auto">
              <Button className="w-full">
                <RotateCcw className="h-4 w-4 mr-2" />
                Review your deck
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={generateStory}
              disabled={isGenerating || !canGenerate}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              New story
            </Button>
          </CardContent>
        </Card>

        <WordSheet word={tappedWord} onClose={() => setTappedWord(null)} />
      </div>
    )
  }

  // Stories list view
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <LearnTabs />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Short Stories</h1>
          <p className="text-muted-foreground">
            AI-generated reading practice using your vocabulary
          </p>
        </div>
        {canGenerate && (
          <Button onClick={generateStory} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                New Story
              </>
            )}
          </Button>
        )}
      </div>

      {/* AI loading overlay driven by the generate stream's status events */}
      {isGenerating && (
        <AILoading status={stage} statusLabels={STORY_STAGE_LABELS} />
      )}

      <ReadingModeToggle displayMode={displayMode} onChange={setDisplayMode} />

      {isLoadingStories || isLoadingCards ? (
        <StoryListSkeleton />
      ) : !canGenerate && savedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Build your vocabulary first</h3>
            <p className="text-muted-foreground mb-4">
              Stories are built from your vocabulary. Add at least {MIN_CARDS_FOR_STORY} cards to generate one.
              {cardCount > 0 && <> You have {cardCount} so far.</>}
            </p>
            <Link href="/upload">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload notes
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : savedStories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No stories yet</h3>
            <p className="text-muted-foreground mb-4">
              Generate your first story to start reading practice
            </p>
            <Button onClick={generateStory} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4 mr-2" />
              )}
              New Story
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {!canGenerate && (
            <p className="text-sm text-muted-foreground">
              Add at least {MIN_CARDS_FOR_STORY} cards to generate new stories.{" "}
              <Link href="/upload" className="underline">Upload notes</Link>
            </p>
          )}
          {savedStories.map((story) => (
            <Card
              key={story.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setActiveStory(story)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold truncate">{story.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{story.titleEnglish}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(story.createdAt!).toLocaleDateString()}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {(story.sentences as StorySentence[]).length} sentences
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete story"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteStory(story.id!)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
