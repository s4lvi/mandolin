import type { StoryDisplayMode } from "@/types"

const KEY = "mandolin.stories.prefs"

export interface StoryPrefs {
  displayMode: StoryDisplayMode
  readAloud: boolean
}

export const DEFAULT_STORY_PREFS: StoryPrefs = {
  displayMode: "hanzi_audio",
  readAloud: false
}

/** Reads persisted reader preferences; storage access is best-effort. */
export function loadStoryPrefs(): StoryPrefs {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return DEFAULT_STORY_PREFS
    const parsed = JSON.parse(raw) as Partial<StoryPrefs>
    return {
      displayMode:
        parsed.displayMode === "hanzi_pinyin_audio" || parsed.displayMode === "hanzi_audio"
          ? parsed.displayMode
          : DEFAULT_STORY_PREFS.displayMode,
      readAloud: typeof parsed.readAloud === "boolean" ? parsed.readAloud : DEFAULT_STORY_PREFS.readAloud
    }
  } catch {
    return DEFAULT_STORY_PREFS
  }
}

export function saveStoryPrefs(prefs: StoryPrefs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Storage unavailable (private mode, quota) — preferences just won't persist.
  }
}
