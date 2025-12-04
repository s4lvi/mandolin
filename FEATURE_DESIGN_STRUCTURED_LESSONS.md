# Feature Design Document: Structured Lesson System

**Feature Name**: Structured Learning Paths with Interactive AI Lessons
**Version**: 2.0
**Author**: Development Team
**Date**: 2025-12-03
**Status**: In Development

---

## Table of Contents

1. [Overview](#overview)
2. [User Goals](#user-goals)
3. [Feature Requirements](#feature-requirements)
4. [User Flows](#user-flows)
5. [Technical Architecture](#technical-architecture)
6. [Data Models](#data-models)
7. [API Specifications](#api-specifications)
8. [UI Components](#ui-components)
9. [AI Integration](#ai-integration)
10. [Edge Cases & Error Handling](#edge-cases--error-handling)
11. [Implementation Status](#implementation-status)
12. [Future Enhancements](#future-enhancements)

---

## Overview

### Problem Statement

Currently, the Mandolin app allows users to:
- Upload notes and create flashcards via AI parsing
- Review cards using spaced repetition (SRS)
- Organize cards by lessons (basic functionality exists)

However, users cannot:
- **Experience interactive AI-powered lesson reviews** - No guided multi-page learning experience
- **Get dynamic feedback from AI** - Static lesson notes instead of adaptive responses
- **Practice with varied question types** - Only flashcard and multiple choice modes
- **Track lesson-specific progress** - No per-page or per-segment completion tracking

### Solution

Implement a **comprehensive structured lesson system** with:
1. **Lesson-based organization**: Cards grouped into coherent learning units
2. **AI-generated interactive lessons**: Multi-page guided learning with diverse segment types
3. **Dynamic AI evaluation**: Real-time assessment and personalized feedback
4. **Progress tracking**: Per-lesson and per-page mastery metrics
5. **Flexible learning modes**: Standard SRS review + Interactive lesson mode

### Success Metrics

- **Adoption**: 70%+ of users complete at least one interactive lesson
- **Engagement**: Average session time increases by 40%
- **Retention**: Users return 50% more frequently to complete lessons
- **Learning outcomes**: Improved long-term retention compared to random review

---

## User Goals

### Primary Goals

1. **Learn progressively**: Follow guided, AI-structured lessons with varied content
2. **Understand context**: Receive AI feedback that explains mistakes and provides corrections
3. **Practice actively**: Engage with multiple question types (flashcard, multiple choice, translation, fill-in)
4. **Track progress**: See completion status per lesson and understand mastery level
5. **Flexible study**: Choose between quick SRS review or in-depth lesson mode

### Secondary Goals

6. **Self-paced learning**: Pause and resume lessons at any time
7. **Personalized feedback**: AI adapts explanations to user's specific mistakes
8. **Organized content**: Lessons automatically created from uploaded notes
9. **Export/share**: Download lesson completion certificates

---

## Feature Requirements

### Implemented (Phase 1-4)

#### ✅ 1. Lesson Association in Upload Flow
- [x] AI generates lesson context during note parsing
- [x] Lesson selection BEFORE parsing (new/existing/none)
- [x] Cards automatically associated with selected lesson
- [x] Duplicate detection and lesson linkage
- [x] Lesson context stored in database

#### ✅ 2. Lesson-Based Review (Standard SRS)
- [x] Lesson selector in review settings
- [x] Filter cards by lesson using SRS algorithm
- [x] Display lesson context during review
- [x] Track progress per lesson

#### ✅ 3. Lesson Detail & Management
- [x] View all cards in a lesson
- [x] Display lesson metadata (number, title, notes)
- [x] Show progress metrics (NEW, LEARNING, REVIEW, LEARNED)
- [x] Action buttons: Learn, Review, Edit

#### ✅ 4. Multi-Select Bulk Operations
- [x] Multi-select mode in deck page
- [x] Add selected cards to existing lesson
- [x] Create new lesson from selected cards

### To Implement (Phase 5 - Interactive Lessons)

#### 🚧 5. Interactive AI Lesson System

**Database Schema**:
- [ ] `LessonPage` model - Store generated lesson pages
- [ ] `PageSegment` model - Individual content segments
- [ ] `SegmentType` enum - TEXT, FLASHCARD, MULTIPLE_CHOICE, FILL_IN, TRANSLATION_EN_ZH, TRANSLATION_ZH_EN, FEEDBACK
- [ ] `LessonProgress` model - Track user progress through lessons

**Page Generation**:
- [ ] Parallel API calls to generate 10+ pages
- [ ] Each page has 2-4 segments of varying types
- [ ] Progressive difficulty across pages
- [ ] Use cards from the lesson in questions

**Segment Types**:
- [ ] TEXT - Informational paragraphs (max 1 paragraph)
- [ ] FLASHCARD - Interactive card flip
- [ ] MULTIPLE_CHOICE - 4-option questions
- [ ] FILL_IN - Complete the sentence
- [ ] TRANSLATION_EN_ZH - English to Chinese translation
- [ ] TRANSLATION_ZH_EN - Chinese to English translation
- [ ] FEEDBACK - AI-generated correction (inserted after wrong answers)

**AI Evaluation**:
- [ ] Real-time answer assessment for translation/fill-in
- [ ] Dynamic feedback generation explaining mistakes
- [ ] Encouragement messages for correct attempts
- [ ] Insert feedback segments after incorrect answers

**User Experience**:
- [ ] Page-by-page navigation (Next/Previous)
- [ ] Progress indicator showing current page
- [ ] Persistent progress (resume where left off)
- [ ] Completion certificate/reward

#### 🔮 6. AI Lesson Enhancement (Future)
- [ ] "Suggest Lessons" from existing cards
- [ ] "Expand Lesson" with related cards
- [ ] "Generate Study Tips" for each lesson
- [ ] Difficulty adjustment based on user performance

---

## User Flows

### Flow 1: Upload Notes → Create Lesson → Generate Context

```
1. User navigates to /upload
2. User selects lesson mode (new/existing/none)
3. User enters lesson metadata if creating new
4. User pastes notes
5. User clicks "Parse Notes"
   → AI generates lesson context (summary)
   → AI extracts flashcards
   → Shows preview with duplicates marked
6. User reviews parsed cards
7. User clicks "Save X Cards + Y Duplicates"
   → New cards created
   → All cards (including duplicates) associated with lesson
   → Lesson context saved to database
8. Redirect to lesson detail page
```

### Flow 2: Interactive Lesson Learning

```
1. User navigates to /lessons
2. User clicks "Learn" button on a lesson
3. System generates lesson pages (10+ pages)
   → Parallel API calls to Claude
   → Each page gets 2-4 segments
   → Returns page structure quickly
4. User lands on Page 1
   → Segments load dynamically
   → TEXT: Introduction paragraph
   → FLASHCARD: Key vocabulary
   → MULTIPLE_CHOICE: Comprehension question
5. User interacts with each segment:
   a. Reads TEXT segment
   b. Flips FLASHCARD
   c. Answers MULTIPLE_CHOICE (instant feedback)
6. User clicks "Next" → Page 2
   → TEXT: Explain grammar pattern
   → FILL_IN: Complete sentence
   → TRANSLATION_EN_ZH: Translate phrase
7. User answers TRANSLATION incorrectly
   → AI evaluates answer
   → FEEDBACK segment inserted:
      "You translated 'I go to school' as '我去学校'
      which is correct! But for future tense, use 会:
      '我会去学校' (I will go to school)"
8. User clicks "Next" → Page 3
   ... continues through all pages
9. Final page shows completion summary
   → Stats: 85% accuracy, 12/15 questions correct
   → Reward: +500 XP, "Lesson Master" badge
   → Options: [Review Mistakes] [Next Lesson] [Back to Lessons]
```

### Flow 3: Resume Lesson Progress

```
1. User previously completed 6/10 pages of a lesson
2. User navigates to /lessons
3. Lesson card shows "60% Complete" badge
4. User clicks "Learn"
5. Modal appears:
   "You're on Page 6. Continue where you left off?"
   [Start from Beginning] [Continue]
6. User clicks "Continue"
7. User lands on Page 7 (next unfinished page)
```

### Flow 4: Standard SRS Review (Existing Flow)

```
1. User navigates to /review
2. User selects lesson from dropdown
3. User chooses "Classic" mode
4. System filters cards by lesson + SRS due date
5. Standard flashcard review proceeds
6. Lesson context available (collapsible panel)
```

---

## Technical Architecture

### System Components

```
┌──────────────────────────────────────────────────────────────┐
│                         Frontend                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Lessons Page          Lesson Detail      Interactive Learn  │
│  ┌──────────┐         ┌──────────┐       ┌──────────┐      │
│  │ List     │────────▶│ Progress │──────▶│ Page Nav │      │
│  │ Cards    │         │ Actions  │       │ Segments │      │
│  │          │         │          │       │ Evaluate │      │
│  └──────────┘         └──────────┘       └──────────┘      │
│                                                               │
│  Upload Page          Review Page (Standard)                 │
│  ┌──────────┐         ┌──────────┐                          │
│  │ Parse    │         │ Settings │                          │
│  │ Generate │         │ SRS Mode │                          │
│  │ Associate│         │          │                          │
│  └──────────┘         └──────────┘                          │
│                                                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ React Query (Cache Layer)
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                      API Routes                               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  /api/lessons/[id]/generate-pages    Generate lesson pages  │
│  /api/lessons/pages/[pageNum]        Get page content       │
│  /api/lessons/pages/evaluate         Evaluate answer (AI)   │
│  /api/lessons/progress               Save/load progress     │
│  /api/parse-notes                    Parse + gen context    │
│  /api/review                         Standard SRS review    │
│                                                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  Database (PostgreSQL)                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Lesson ──1:M──▶ LessonPage ──1:M──▶ PageSegment            │
│     │                                                         │
│     └──1:M──▶ Card                                           │
│     └──1:M──▶ LessonProgress (userId, currentPage)          │
│                                                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  Anthropic Claude API                         │
├──────────────────────────────────────────────────────────────┤
│  - Generate lesson pages (parallel requests)                 │
│  - Evaluate translation answers                              │
│  - Generate feedback corrections                             │
│  - Generate lesson context (on upload)                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Existing Models (Implemented)

```prisma
model Lesson {
  id          String    @id @default(cuid())
  number      Int
  title       String?
  date        DateTime?
  notes       String?   @db.Text  // AI-generated lesson context
  deckId      String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  deck        Deck      @relation(...)
  cards       Card[]
  pages       LessonPage[]       // NEW
  progress    LessonProgress[]   // NEW

  @@unique([deckId, number])
  @@index([deckId])
}

model Card {
  id           String     @id @default(cuid())
  hanzi        String
  pinyin       String
  english      String
  notes        String?
  type         CardType
  state        CardState  @default(NEW)
  deckId       String
  lessonId     String?

  deck         Deck       @relation(...)
  lesson       Lesson?    @relation(..., onDelete: SetNull)
}
```

### New Models (Phase 5 - To Implement)

```prisma
model LessonPage {
  id         String        @id @default(cuid())
  lessonId   String
  lesson     Lesson        @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  pageNumber Int           // 1, 2, 3, ..., 10
  segments   PageSegment[]
  createdAt  DateTime      @default(now())

  @@unique([lessonId, pageNumber])
  @@index([lessonId])
}

model PageSegment {
  id          String       @id @default(cuid())
  pageId      String
  page        LessonPage   @relation(fields: [pageId], references: [id], onDelete: Cascade)
  orderIndex  Int          // 0, 1, 2, 3 (order within page)
  type        SegmentType
  content     Json         // Flexible structure for different types
  createdAt   DateTime     @default(now())

  @@index([pageId])
}

enum SegmentType {
  TEXT              // Informational paragraph
  FLASHCARD         // Show/hide flashcard
  MULTIPLE_CHOICE   // Multiple choice question
  FILL_IN           // Fill in the blank
  TRANSLATION_EN_ZH // English → Chinese
  TRANSLATION_ZH_EN // Chinese → English
  FEEDBACK          // AI feedback (inserted dynamically)
}

model LessonProgress {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  lessonId        String
  lesson          Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  currentPage     Int       @default(1)
  totalPages      Int
  responses       Json[]    // Array of user responses per segment
  completedAt     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([userId, lessonId])
  @@index([userId])
  @@index([lessonId])
}
```

### Segment Content Structures (TypeScript)

```typescript
// types/lesson-segments.ts

export type SegmentContent =
  | TextSegmentContent
  | FlashcardSegmentContent
  | MultipleChoiceSegmentContent
  | FillInSegmentContent
  | TranslationSegmentContent
  | FeedbackSegmentContent

interface TextSegmentContent {
  type: "TEXT"
  text: string     // Max 1 paragraph
  title?: string
}

interface FlashcardSegmentContent {
  type: "FLASHCARD"
  cardId?: string  // Optional reference to actual card
  front: string
  back: string
  hint?: string
}

interface MultipleChoiceSegmentContent {
  type: "MULTIPLE_CHOICE"
  question: string
  options: string[]        // 4 options
  correctIndex: number
  explanation?: string
}

interface FillInSegmentContent {
  type: "FILL_IN"
  prompt: string
  sentence: string         // e.g., "我___去学校"
  correctAnswers: string[] // Multiple valid answers
  hint?: string
}

interface TranslationSegmentContent {
  type: "TRANSLATION_EN_ZH" | "TRANSLATION_ZH_EN"
  sourceText: string
  acceptableTranslations: string[]
  hint?: string
}

interface FeedbackSegmentContent {
  type: "FEEDBACK"
  userAnswer: string
  correctAnswer: string
  explanation: string   // AI-generated correction
  encouragement?: string
}
```

---

## API Specifications

### 1. Generate Lesson Pages (Parallel)

**Endpoint**: `POST /api/lessons/[id]/generate-pages`

**Request Body**: None (uses lesson ID from URL)

**Response**:
```typescript
{
  lessonId: string
  totalPages: number        // 10-15 pages
  pages: Array<{
    pageNumber: number
    segmentCount: number
    types: SegmentType[]
  }>
}
```

**Implementation**:
- Fetch lesson with all cards
- Generate 10 page structures in parallel (Promise.all)
- Each AI call generates 2-4 segments for one page
- Return lightweight structure (no full content yet)

---

### 2. Get Page Content

**Endpoint**: `GET /api/lessons/pages/[pageNumber]?lessonId=xxx`

**Response**:
```typescript
{
  page: {
    id: string
    pageNumber: number
    segments: Array<{
      id: string
      type: SegmentType
      orderIndex: number
      content: SegmentContent  // Typed by segment type
    }>
  }
}
```

**Implementation**:
- Check if page already generated
- If not, generate on-demand with AI
- Cache in database for future loads

---

### 3. Evaluate User Answer

**Endpoint**: `POST /api/lessons/pages/evaluate`

**Request Body**:
```typescript
{
  segmentId: string
  segmentType: SegmentType
  userAnswer: string
  correctAnswers?: string[]   // For reference
}
```

**Response**:
```typescript
{
  correct: boolean
  feedback: FeedbackSegmentContent | null  // Only if wrong
}
```

**Implementation**:
- For TRANSLATION/FILL_IN, call Claude to evaluate
- Compare semantic meaning, not exact match
- Generate encouraging feedback if wrong

---

### 4. Save/Load Lesson Progress

**Endpoint**: `GET /api/lessons/progress?lessonId=xxx`

**Response**:
```typescript
{
  currentPage: number
  totalPages: number
  responses: Array<{
    segmentId: string
    correct: boolean
    userAnswer: string
  }>
}
```

**Endpoint**: `POST /api/lessons/progress`

**Request Body**:
```typescript
{
  lessonId: string
  currentPage: number
  responses: Array<{ segmentId: string, correct: boolean, userAnswer: string }>
}
```

---

## AI Integration

### Prompt: Generate Lesson Page

```typescript
export const LESSON_PAGE_GENERATION_PROMPT = `You are creating an interactive Chinese language lesson.

**Lesson Context:**
{LESSON_CONTEXT}

**Cards in Lesson:**
{CARD_LIST}

**Page Number:** {PAGE_NUMBER} of {TOTAL_PAGES}

Create 2-4 educational segments for this page. Use cards from the lesson.

**Segment Types:**
- TEXT: Explain concept (1 paragraph max)
- FLASHCARD: Highlight key vocabulary
- MULTIPLE_CHOICE: Test comprehension (4 options)
- FILL_IN: Complete sentence
- TRANSLATION_EN_ZH: Translate English to Chinese
- TRANSLATION_ZH_EN: Translate Chinese to English

**Progressive Difficulty:**
- Early pages: Introduce vocabulary, simple concepts
- Middle pages: Practice with varied question types
- Later pages: Complex translations, cultural notes

Return JSON array of segments with proper typing.`
```

### Prompt: Evaluate Translation

```typescript
export const TRANSLATION_EVAL_PROMPT = `Evaluate this Chinese translation.

**Question:** Translate to Chinese: "{SOURCE_TEXT}"
**User Answer:** {USER_ANSWER}
**Expected Answers:** {ACCEPTABLE_ANSWERS}

Determine correctness:
1. Correct - Matches meaning (even if different words)
2. Partially correct - Right idea, minor errors
3. Incorrect - Wrong meaning or major errors

Provide:
- isCorrect: boolean
- explanation: Friendly, specific feedback
- correctAnswer: Best translation (if wrong)
- encouragement: Positive note

Return JSON.`
```

---

## Implementation Status

### ✅ Phase 1-4: Basic Lesson System (Completed)

- [x] Database schema for Lesson, Card relationships
- [x] Upload flow with AI context generation
- [x] Lesson association (new/existing/none)
- [x] Duplicate card handling
- [x] Lesson detail pages with progress tracking
- [x] Multi-select bulk operations
- [x] Standard SRS review filtered by lesson
- [x] Basic lesson context display

### 🚧 Phase 5: Interactive AI Lessons (In Progress)

**What Was Implemented (Incorrectly)**:
- ❌ "Narrative Mode" - Simple review with lesson notes displayed
- ❌ Static lesson context shown in text box
- ❌ Related cards shown when incorrect (client-side only)

**What Needs to Be Removed**:
- `NarrativeMode` component (src/components/review/narrative-mode.tsx)
- "Learn by Lesson" review mode selector
- Static lesson notes display during review

**What Needs to Be Built**:
- [ ] Database migration: Add LessonPage, PageSegment, LessonProgress
- [ ] API: Generate lesson pages (parallel)
- [ ] API: Get page content
- [ ] API: Evaluate answers with AI
- [ ] API: Save/load progress
- [ ] Component: Interactive lesson page navigation
- [ ] Component: Segment renderer for all types
- [ ] Component: Translation input with AI evaluation
- [ ] Component: Fill-in-the-blank input
- [ ] Component: Dynamic feedback insertion
- [ ] Component: Progress tracker and completion

### 🔮 Future Enhancements

- [ ] AI suggest lessons from unassociated cards
- [ ] AI expand lesson with related content
- [ ] Lesson templates (HSK levels, topics)
- [ ] Collaborative lesson sharing
- [ ] Multimedia (images, audio, video)
- [ ] Advanced analytics per lesson

---

## Next Steps

1. **Remove Incorrect Implementation**
   - Delete NarrativeMode component and related code
   - Remove "narrative" mode from review page

2. **Database Migration**
   - Add LessonPage, PageSegment, LessonProgress models
   - Add SegmentType enum

3. **API Implementation**
   - Build page generation endpoint (parallel AI calls)
   - Build page content endpoint
   - Build evaluation endpoint

4. **Frontend Components**
   - Create lesson learn page (/lessons/[id]/learn)
   - Build segment renderer
   - Implement page navigation

5. **Testing**
   - Test parallel page generation
   - Test AI evaluation accuracy
   - Test progress persistence

---

## Document Change Log

| Version | Date       | Changes                                           |
|---------|------------|---------------------------------------------------|
| 1.0     | 2025-12-03 | Initial design document                           |
| 2.0     | 2025-12-03 | Updated with interactive AI lesson system design  |
|         |            | Removed incorrect "Narrative Mode" concept        |
|         |            | Added multi-page segment-based learning flow      |

---

**End of Document**
