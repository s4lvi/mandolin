# Feature Design Document: Structured Lesson System

**Feature Name**: Structured Learning Paths with Narrative Review
**Version**: 1.0
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
11. [Testing Strategy](#testing-strategy)
12. [Future Enhancements](#future-enhancements)

---

## Overview

### Problem Statement

Currently, the Mandolin app allows users to:
- Upload notes and create flashcards via AI parsing
- Review cards using spaced repetition (SRS)
- Organize cards by lessons (metadata exists but isn't functional)

However, users cannot:
- **Associate uploaded cards with lessons** (metadata collected but ignored)
- **Review specific lessons** (lesson filter doesn't exist)
- **Learn in a structured, narrative way** (cards are randomly shuffled)
- **Get contextual feedback** when wrong (no lesson notes or related cards shown)

### Solution

Implement a **structured lesson system** that enables:
1. **Lesson-based organization**: Cards grouped into coherent learning units
2. **Narrative learning mode**: Sequential review with contextual explanations
3. **AI-powered lesson creation**: Automatic lesson suggestions and expansion
4. **Progress tracking**: Per-lesson mastery metrics
5. **Flexible learning paths**: User-defined lesson sequences

### Success Metrics

- **Adoption**: 70%+ of users create at least one lesson
- **Engagement**: Average session time increases by 25%
- **Retention**: Users return 40% more frequently to complete lessons
- **Learning outcomes**: Improved accuracy in lesson-based reviews vs random reviews

---

## User Goals

### Primary Goals

1. **Organize learning**: Group related vocabulary and grammar into coherent lessons
2. **Learn progressively**: Follow a structured path from beginner to advanced
3. **Understand context**: See how words/concepts relate within a lesson
4. **Track progress**: Know which lessons are mastered vs in-progress
5. **Reduce overwhelm**: Focus on one lesson at a time instead of 100s of random cards

### Secondary Goals

6. **Save time**: Let AI suggest optimal lesson groupings
7. **Expand knowledge**: AI recommends related cards to add to lessons
8. **Flexible study**: Choose between narrative learning or SRS review
9. **Self-directed**: Create custom lessons from existing cards

---

## Feature Requirements

### Must-Have (MVP)

#### 1. Lesson Association in Upload Flow
- [ ] Toggle to associate cards with lesson after upload
- [ ] Option: "Add to existing lesson" (default)
- [ ] Option: "Create new lesson"
- [ ] Dropdown showing existing lessons
- [ ] Form for new lesson (number, title, optional notes)
- [ ] Separate API call to associate cards after creation

#### 2. Lesson-Based Review
- [ ] Lesson selector in review settings
- [ ] Filter cards by lesson using SRS algorithm
- [ ] Display "Reviewing: Lesson X" context
- [ ] Show lesson progress during review

#### 3. Narrative Learning Mode
- [ ] New review mode: "Learn by Lesson"
- [ ] Sequential card presentation (SRS-sorted within lesson)
- [ ] Display lesson notes at top of screen
- [ ] On incorrect answer, show:
  - Lesson notes (expandable)
  - Card explanation (notes field)
  - Related cards (3-5 similar cards from lesson)
- [ ] Progress indicator for lesson completion

#### 4. Lesson Detail Page
- [ ] View all cards in a lesson
- [ ] Display lesson metadata (number, title, date, notes)
- [ ] Show progress metrics (% NEW, LEARNING, REVIEW, LEARNED)
- [ ] Action buttons: "Learn Lesson", "Review Lesson", "Edit", "Delete"

#### 5. Manual Card-Lesson Association
- [ ] Multi-select mode in deck page
- [ ] "Add to Lesson" button
- [ ] "Create Lesson from Selection" button
- [ ] Bulk associate cards with lesson

#### 6. Deck Page Lesson Filter
- [ ] Read `lessonId` from URL query parameter
- [ ] Filter cards by lesson
- [ ] Display lesson info in header
- [ ] "Clear filter" button

### Should-Have (Phase 2)

#### 7. AI Lesson Suggestions
- [ ] "Suggest Lessons" button on lessons page
- [ ] AI analyzes all cards and proposes 3-5 lesson groupings
- [ ] Modal showing suggestions with:
  - Proposed lesson title
  - List of cards (with preview)
  - Rationale (why these cards together)
- [ ] User can accept, modify, or reject

#### 8. AI Lesson Expansion
- [ ] "Expand Lesson" button on lesson detail page
- [ ] AI suggests:
  - Existing cards to add
  - New cards to create
- [ ] Modal showing suggestions with checkboxes
- [ ] User reviews and confirms

#### 9. AI Lesson Notes Generation
- [ ] "Generate Notes" button on lesson detail
- [ ] AI writes comprehensive lesson introduction
- [ ] Explains key concepts covered
- [ ] Provides study tips
- [ ] User can edit before saving

### Nice-to-Have (Phase 3)

#### 10. Lesson Ordering & Prerequisites
- [ ] Drag-and-drop lesson reordering
- [ ] Set prerequisite lessons
- [ ] Lock lessons until prerequisites completed
- [ ] Visual learning path timeline

#### 11. Lesson Templates
- [ ] Predefined lesson structures (HSK levels, topic-based)
- [ ] Import template and auto-populate with cards
- [ ] Share lesson templates (future: multi-user)

#### 12. Enhanced Progress Tracking
- [ ] Lesson completion achievements
- [ ] XP bonuses for finishing lessons
- [ ] Streak tracking per lesson
- [ ] Estimated time to master lesson

---

## User Flows

### Flow 1: Upload Notes → Create Lesson → Associate Cards

```
1. User navigates to /upload
2. User enters lesson metadata (optional at this stage)
3. User pastes notes
4. User clicks "Parse with AI"
   → AI extracts cards
   → Shows preview with duplicates marked
5. User toggles off unwanted cards
6. User clicks "Save Cards"
   → Cards are created in database
   → Success message: "15 cards created"
7. NEW: Modal appears: "Associate with Lesson?"
   → Option A: "Add to existing lesson" [DEFAULT]
      → Dropdown: Select lesson
      → Shows: "Lesson 3: Shopping Vocabulary (23 existing cards)"
   → Option B: "Create new lesson"
      → Form: Lesson number, title, notes (optional)
   → Option C: "Skip" (cards remain unassociated)
8. User selects option and confirms
   → API call: POST /api/cards/associate-lesson
   → Success: "15 cards added to Lesson 3"
9. Redirect to lesson detail page (optional)
```

**Alternative Flow 1A**: User wants to add to multiple lessons
- Checkbox: "Associate cards differently"
- Shows list of created cards with dropdown per card
- User assigns each card to a lesson
- Bulk update

### Flow 2: Review Specific Lesson (Standard Mode)

```
1. User navigates to /review
2. Settings screen appears
3. User selects:
   → Review mode: "Standard" (SRS-based)
   → Lesson: Dropdown shows "Lesson 3: Shopping Vocabulary"
   → Card types: All
   → Limit: 20 cards
4. User clicks "Start Review"
   → API fetches due cards from Lesson 3 only
   → 70% priority, 30% non-priority (existing SRS logic)
   → But cards are filtered to lessonId
5. Review proceeds as normal
   → Card flip, self-rate (AGAIN/HARD/GOOD/EASY)
   → SRS updates for each card
6. Session complete
   → Shows results with lesson progress
   → "Lesson 3: 15/20 cards reviewed, 80% accuracy"
```

### Flow 3: Learn by Lesson (Narrative Mode)

```
1. User navigates to /lessons
2. User clicks "Learn" button on Lesson 5
3. Review settings screen:
   → Mode auto-set to "Learn by Lesson" (narrative)
   → Limit pre-filled with lesson card count
4. User clicks "Start Learning"
5. Lesson introduction screen appears:
   → Displays lesson title and notes
   → "This lesson covers: X new words, Y grammar points"
   → Button: "Begin Lesson"
6. First card appears:
   → Lesson notes visible at top (collapsible)
   → Card displayed (flip to see answer)
   → User self-assesses
7a. If CORRECT (GOOD/EASY):
   → Brief positive feedback
   → "Next" button to continue
7b. If INCORRECT (AGAIN/HARD):
   → Expanded feedback panel appears:
      → Section 1: "Lesson Context" - lesson notes
      → Section 2: "About this word" - card notes
      → Section 3: "Related cards" - 3-5 similar cards from lesson
   → User reviews feedback
   → "Continue" button
8. After all cards reviewed:
   → Lesson summary screen
   → Progress chart: NEW → LEARNING → REVIEW → LEARNED
   → "Lesson mastered" if all cards LEARNED
   → Options: "Review again", "Next lesson", "Back to lessons"
```

### Flow 4: AI Suggest Lessons

```
1. User navigates to /lessons
2. User clicks "Suggest Lessons" button
3. Loading modal: "Analyzing your 147 cards..."
   → AI analyzes:
      - Card content (hanzi, english, notes)
      - Card types (VOCABULARY, GRAMMAR, etc.)
      - Existing tags (HSK levels, topics)
      - Current lesson structure
4. Suggestion modal appears with 4 proposals:

   SUGGESTION 1:
   Title: "HSK 1 Core Vocabulary"
   Cards: 23 cards (shows first 5 with "...and 18 more")
   Rationale: "These cards are all HSK-1 level basic vocabulary"
   Actions: [Accept] [Modify] [Skip]

   SUGGESTION 2:
   Title: "Food & Restaurant Vocabulary"
   Cards: 18 cards
   Rationale: "Related to dining, ordering, and food vocabulary"

   ... etc

5. User clicks "Accept" on Suggestion 1
   → Confirmation: "Create Lesson 8 with 23 cards?"
   → User confirms
   → Lesson created, cards associated
   → Success message
6. User can accept multiple suggestions
7. Modal closes, lessons page refreshes
```

### Flow 5: Expand Lesson with AI

```
1. User on lesson detail page (Lesson 3: Shopping)
2. User clicks "Expand Lesson" button
3. Loading: "Finding related content..."
4. Expansion modal appears:

   EXISTING CARDS TO ADD:
   ☐ 便宜 (piányi) - cheap
   ☐ 贵 (guì) - expensive
   ☐ 多少钱 (duōshao qián) - how much
   [5 more cards]

   NEW CARDS TO CREATE:
   ☐ 打折 (dǎzhé) - discount
      English: discount, on sale
      Notes: Common in shopping contexts
      Type: VOCABULARY
   [3 more suggested cards]

   AI REASONING:
   "These cards relate to shopping and prices, complementing
   your existing vocabulary about stores and purchases."

   [Select All] [Deselect All]
   [Confirm] [Cancel]

5. User selects desired cards
6. User clicks "Confirm"
   → Existing cards: Associated with lesson
   → New cards: Created and associated
7. Lesson detail page refreshes
   → Shows updated card count
   → New cards appear in list
```

### Flow 6: Create Lesson from Selected Cards

```
1. User on deck page viewing all cards
2. User clicks "Select Cards" button
   → UI enters selection mode
   → Checkboxes appear on each card
3. User selects 12 cards related to travel
4. Toolbar appears: "12 cards selected"
   → [Add to Lesson ▼] [Create Lesson] [Cancel]
5. User clicks "Create Lesson"
6. Modal appears:
   "Create New Lesson from 12 Cards"

   Lesson Number: [auto-filled with next number]
   Lesson Title: [empty]
   Lesson Notes: [empty textarea]

   AI SUGGESTION: "Travel Essentials"
   (Click to use)

   [Create] [Cancel]

7. User clicks AI suggestion or enters custom title
8. User clicks "Create"
   → Lesson created
   → Cards associated
   → Redirect to lesson detail page
```

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Upload Page          Lessons Page        Review Page        │
│  ┌──────────┐        ┌──────────┐       ┌──────────┐       │
│  │ Parse    │        │ List     │       │ Settings │       │
│  │ Preview  │──────▶ │ Detail   │◀───── │ Standard │       │
│  │ Associate│        │ Progress │       │ Narrative│       │
│  └──────────┘        └──────────┘       └──────────┘       │
│                                                               │
│  Deck Page                                                   │
│  ┌──────────────────────────────────────────────┐          │
│  │ Card List │ Multi-Select │ Lesson Filter     │          │
│  └──────────────────────────────────────────────┘          │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ React Query (Cache Layer)
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                      API Routes                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  /api/lessons/                                               │
│  ├─ GET /            List all lessons                       │
│  ├─ POST /           Create lesson                          │
│  ├─ GET /[id]        Get lesson detail                      │
│  ├─ PUT /[id]        Update lesson                          │
│  ├─ DELETE /[id]     Delete lesson                          │
│  ├─ POST /suggest    AI suggest lessons                     │
│  ├─ POST /[id]/expand         AI expand lesson              │
│  └─ POST /[id]/generate-notes AI generate notes             │
│                                                               │
│  /api/cards/                                                 │
│  ├─ POST /associate-lesson   Associate cards with lesson    │
│  └─ POST /bulk              Create multiple cards (exists)  │
│                                                               │
│  /api/review/                                                │
│  └─ GET /?lessonId=...       Get review cards (modified)    │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  Database (PostgreSQL)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User ──1:M──▶ Deck ──1:M──▶ Lesson                         │
│                  │              │                             │
│                  │              └─1:M─▶ Card                 │
│                  │                      │                     │
│                  └──────────1:M────────┘                     │
│                                          │                     │
│                                      ReviewHistory           │
│                                      TestQuestion            │
│                                      CardTag                 │
│                                                               │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  External Services                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Anthropic Claude API                                        │
│  ├─ Parse notes (existing)                                  │
│  ├─ Suggest lessons (new)                                   │
│  ├─ Expand lesson (new)                                     │
│  └─ Generate lesson notes (new)                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Upload → Lesson Association

```
┌─────────┐
│ Upload  │
│ Page    │
└────┬────┘
     │
     │ 1. Parse notes
     ▼
┌──────────────┐
│ POST /api/   │
│ parse-notes  │
└──────┬───────┘
       │
       │ 2. Returns parsed cards
       ▼
┌──────────────┐
│ Preview      │
│ Component    │
└──────┬───────┘
       │
       │ 3. User clicks "Save Cards"
       ▼
┌──────────────┐
│ POST /api/   │──────▶ Database: Create cards
│ cards/bulk   │
└──────┬───────┘
       │
       │ 4. Cards created, IDs returned
       ▼
┌──────────────┐
│ Lesson       │
│ Modal        │◀────── User selects/creates lesson
└──────┬───────┘
       │
       │ 5. POST { cardIds, lessonId }
       ▼
┌──────────────┐
│ POST /api/   │──────▶ Database: Update cards
│ cards/       │        SET lessonId = ?
│ associate-   │        WHERE id IN (?)
│ lesson       │
└──────┬───────┘
       │
       │ 6. Success
       ▼
┌──────────────┐
│ Redirect to  │
│ Lesson Detail│
└──────────────┘
```

### Data Flow: Narrative Review

```
┌─────────┐
│ Lesson  │
│ Detail  │
└────┬────┘
     │
     │ User clicks "Learn Lesson"
     ▼
┌──────────────┐
│ Review Page  │
│ (Narrative)  │
└──────┬───────┘
       │
       │ 1. Fetch cards for lesson
       ▼
┌──────────────┐
│ GET /api/    │
│ review?      │
│ lessonId=X   │
└──────┬───────┘
       │
       │ 2. Cards returned (SRS-sorted within lesson)
       ▼
┌──────────────┐
│ Narrative    │
│ Mode UI      │
└──────┬───────┘
       │
       │ 3. Display first card
       │
       │ User answers INCORRECT
       ▼
┌──────────────┐
│ Fetch        │
│ Related      │
│ Context      │
└──────┬───────┘
       │
       │ 4. Get related cards (client-side filter)
       │    Get lesson notes (already cached)
       ▼
┌──────────────┐
│ Display      │
│ Feedback     │
│ Panel        │
└──────┬───────┘
       │
       │ 5. User reviews, clicks "Continue"
       ▼
┌──────────────┐
│ POST /api/   │──────▶ Database: Update card SRS
│ review       │        Record review history
│              │        Update stats
└──────┬───────┘
       │
       │ 6. Next card
       ▼
       ...
```

---

## Data Models

### Existing Models (No Changes)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())

  decks         Deck[]
  // ... other relations
}

model Deck {
  id        String   @id @default(cuid())
  userId    String
  name      String
  createdAt DateTime @default(now())

  user      User     @relation(...)
  cards     Card[]
  lessons   Lesson[]
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
  lessonId     String?    // ← Already exists!

  deck         Deck       @relation(...)
  lesson       Lesson?    @relation(..., onDelete: SetNull)
  // ... other relations
}
```

### Modified Models

```prisma
model Lesson {
  id          String    @id @default(cuid())
  number      Int
  title       String?
  date        DateTime?
  notes       String?   @db.Text
  deckId      String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // NEW FIELDS (Phase 3):
  order       Int?                    // For explicit lesson ordering
  prerequisiteId String?              // Optional prerequisite lesson
  isPublished Boolean   @default(true) // Hide unpublished lessons

  deck        Deck      @relation(...)
  cards       Card[]
  prerequisite Lesson?  @relation("LessonPrerequisite", fields: [prerequisiteId], references: [id], onDelete: SetNull)
  dependents   Lesson[] @relation("LessonPrerequisite")

  @@unique([deckId, number])
  @@index([deckId])
  @@index([deckId, order])
  @@index([prerequisiteId])
}
```

### New Models (Optional - Phase 3)

```prisma
model LessonProgress {
  id           String    @id @default(cuid())
  userId       String
  lessonId     String
  completed    Boolean   @default(false)
  lastReviewed DateTime?
  mastery      Float     @default(0) // 0-1 percentage
  cardsNew     Int       @default(0)
  cardsLearning Int      @default(0)
  cardsReview  Int       @default(0)
  cardsLearned Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user         User      @relation(...)
  lesson       Lesson    @relation(...)

  @@unique([userId, lessonId])
  @@index([userId])
  @@index([lessonId])
}
```

---

## API Specifications

### 1. Associate Cards with Lesson

**Endpoint**: `POST /api/cards/associate-lesson`

**Request Body**:
```typescript
{
  cardIds: string[]      // Array of card IDs to associate
  lessonId: string       // Lesson to associate with
}
```

**Response**:
```typescript
{
  success: true
  updatedCount: number   // Number of cards updated
  lessonTitle: string    // For display
}
```

**Implementation**:
```typescript
// Verify user owns all cards
// Update cards in transaction
await prisma.card.updateMany({
  where: {
    id: { in: cardIds },
    deck: { userId: session.user.id }
  },
  data: { lessonId }
})
```

---

### 2. Get Lesson with Cards

**Endpoint**: `GET /api/lessons/[id]`

**Query Parameters**: None

**Response**:
```typescript
{
  lesson: {
    id: string
    number: number
    title: string | null
    date: string | null
    notes: string | null
    createdAt: string
    cardCount: number
    cards: Card[]         // Includes full card data
    progress: {
      new: number
      learning: number
      review: number
      learned: number
      total: number
      masteryPercentage: number  // learned / total * 100
    }
  }
}
```

**Implementation**:
```typescript
const lesson = await prisma.lesson.findUnique({
  where: { id: params.id },
  include: {
    cards: {
      include: { tags: { include: { tag: true } } }
    },
    _count: { select: { cards: true } }
  }
})

// Calculate progress by grouping cards by state
const progress = {
  new: lesson.cards.filter(c => c.state === 'NEW').length,
  // ... etc
}
```

---

### 3. AI Suggest Lessons

**Endpoint**: `POST /api/lessons/suggest`

**Request Body**:
```typescript
{
  deckId: string
  maxSuggestions?: number  // Default: 5
}
```

**Response**:
```typescript
{
  suggestions: [
    {
      title: string
      rationale: string
      cardIds: string[]
      cards: Card[]        // Preview (first 5 cards)
      estimatedCount: number
    }
  ]
}
```

**AI Prompt**:
```
You are a Chinese language learning expert. Analyze the following flashcards
and suggest optimal lesson groupings.

Cards:
[JSON array of cards with hanzi, pinyin, english, type, tags]

Requirements:
- Create 3-5 lesson suggestions
- Group cards by related topics, HSK level, or grammar patterns
- Each lesson should have 10-30 cards
- Provide a concise title and rationale for each lesson
- Consider pedagogical progression (simple → complex)

Return JSON format:
{
  "suggestions": [
    {
      "title": "HSK 1 Core Vocabulary",
      "rationale": "These are essential HSK-1 level words for beginners",
      "cardIndices": [0, 3, 7, 12, ...]
    }
  ]
}
```

**Implementation**:
```typescript
// Fetch all cards from deck
const cards = await prisma.card.findMany({
  where: { deckId, lessonId: null },  // Only unassociated cards
  include: { tags: true }
})

// Call Claude API
const suggestions = await generateLessonSuggestions(cards)

// Return with full card data for preview
return suggestions.map(s => ({
  ...s,
  cards: cards.filter((c, i) => s.cardIndices.includes(i)).slice(0, 5)
}))
```

---

### 4. AI Expand Lesson

**Endpoint**: `POST /api/lessons/[id]/expand`

**Request Body**: None (reads lesson ID from URL)

**Response**:
```typescript
{
  existingCards: Card[]    // Unassociated cards that fit this lesson
  newCardSuggestions: ParsedCard[]  // AI-suggested new cards to create
  rationale: string
}
```

**AI Prompt**:
```
You are expanding a Chinese lesson. The lesson currently contains these cards:
[JSON array of lesson's current cards]

Other unassociated cards in the deck:
[JSON array of cards without lessonId]

Task 1: Identify which existing cards should be added to this lesson.
Task 2: Suggest 3-5 new cards that would complement this lesson.

Return JSON:
{
  "existingCardIndices": [2, 5, 8],
  "newCards": [
    {
      "hanzi": "打折",
      "pinyin": "dǎzhé",
      "english": "discount",
      "notes": "Common in shopping contexts",
      "type": "VOCABULARY",
      "suggestedTags": ["shopping", "HSK-4"]
    }
  ],
  "rationale": "These additions strengthen your shopping vocabulary"
}
```

---

### 5. AI Generate Lesson Notes

**Endpoint**: `POST /api/lessons/[id]/generate-notes`

**Request Body**: None

**Response**:
```typescript
{
  notes: string  // Generated markdown content
}
```

**AI Prompt**:
```
Write comprehensive lesson notes for a Chinese language lesson.

Lesson title: {title}
Cards covered:
[JSON array of cards]

Create pedagogical notes including:
1. Introduction (what this lesson covers)
2. Key concepts explanation
3. Usage examples
4. Common mistakes to avoid
5. Study tips
6. Cultural notes (if relevant)

Return markdown-formatted text (not JSON).
```

---

### 6. Get Review Cards (Modified)

**Endpoint**: `GET /api/review`

**Query Parameters**:
```typescript
{
  limit?: number           // Max cards to return
  allCards?: boolean       // Include non-due cards
  types?: string[]         // Filter by card types
  tagIds?: string[]        // Filter by tags
  lessonId?: string        // NEW: Filter by lesson
}
```

**Implementation Changes**:
```typescript
// Add lessonId to where clause
const where: Prisma.CardWhereInput = {
  deckId: deck.id,
  ...(lessonId && { lessonId }),  // NEW
  ...(types && { type: { in: types } }),
  ...(tagIds && { tags: { some: { tagId: { in: tagIds } } } }),
  // ... other filters
}
```

---

## UI Components

### Component Hierarchy

```
UploadPage
├── NotesTextarea
├── LessonMetadataForm (existing, collects but doesn't use)
├── ParseButton
├── ParsedCardsPreview
└── LessonAssociationModal (NEW)
    ├── LessonSelector
    │   ├── ExistingLessonDropdown
    │   └── CreateLessonForm
    └── AssociateButton

LessonsPage
├── LessonsList
│   └── LessonCard (with progress bar)
├── SuggestLessonsButton (NEW)
└── SuggestLessonsModal (NEW)
    └── LessonSuggestionCard

LessonDetailPage (NEW)
├── LessonHeader
│   ├── LessonMetadata
│   └── ActionButtons
│       ├── LearnButton
│       ├── ReviewButton
│       ├── ExpandButton
│       └── EditButton
├── LessonNotes (rich text)
├── ProgressMetrics
└── CardsList
    └── CardItem

ReviewPage
├── ReviewSettings
│   ├── ModeSelector (Standard vs Narrative)
│   ├── LessonSelector (NEW)
│   ├── TypeFilters
│   └── TagFilters
├── StandardReviewMode (existing)
└── NarrativeReviewMode (NEW)
    ├── LessonContextPanel
    ├── CardDisplay
    ├── AnswerButtons
    └── FeedbackPanel (on incorrect)
        ├── LessonNotesSection
        ├── CardExplanationSection
        └── RelatedCardsSection

DeckPage
├── CardFilters
│   ├── SearchBar
│   ├── TypeFilter
│   ├── TagFilter
│   └── LessonFilter (NEW)
├── SelectionToolbar (NEW)
│   ├── AddToLessonButton
│   └── CreateLessonButton
└── CardList (with multi-select)
```

### Key Component Specifications

#### LessonAssociationModal

**Props**:
```typescript
interface LessonAssociationModalProps {
  open: boolean
  onClose: () => void
  cardIds: string[]
  onSuccess: (lessonId: string) => void
}
```

**State**:
```typescript
const [mode, setMode] = useState<'existing' | 'new'>('existing')
const [selectedLessonId, setSelectedLessonId] = useState<string>()
const [newLessonData, setNewLessonData] = useState({
  number: nextLessonNumber,
  title: '',
  notes: ''
})
```

**UI**:
```
┌────────────────────────────────────────────┐
│  Associate 15 cards with Lesson            │
├────────────────────────────────────────────┤
│                                             │
│  ⦿ Add to existing lesson                  │
│  ○ Create new lesson                       │
│                                             │
│  [Lesson 3: Shopping Vocabulary ▼]         │
│   23 cards · Last updated 2 days ago       │
│                                             │
│                                             │
│  [Skip]  [Associate Cards]                 │
└────────────────────────────────────────────┘
```

---

#### NarrativeReviewMode

**Props**:
```typescript
interface NarrativeReviewModeProps {
  lessonId: string
  lesson: Lesson
  cards: Card[]
  onComplete: () => void
}
```

**State**:
```typescript
const [currentIndex, setCurrentIndex] = useState(0)
const [isFlipped, setIsFlipped] = useState(false)
const [showFeedback, setShowFeedback] = useState(false)
const [relatedCards, setRelatedCards] = useState<Card[]>([])
```

**UI Layout**:
```
┌────────────────────────────────────────────────────────────┐
│ Lesson 5: Restaurant Vocabulary               [3/20] 15%   │
├────────────────────────────────────────────────────────────┤
│ ▼ Lesson Notes                                             │
│   This lesson covers common phrases and vocabulary used... │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│                     ┌──────────────┐                       │
│                     │              │                       │
│                     │   菜单        │                       │
│                     │              │                       │
│                     │   [🔊]        │                       │
│                     │              │                       │
│                     │   cài dān    │                       │
│                     │              │                       │
│                     │  [Tap to flip]                       │
│                     └──────────────┘                       │
│                                                             │
└────────────────────────────────────────────────────────────┘

After flip + incorrect answer:

┌────────────────────────────────────────────────────────────┐
│ Lesson 5: Restaurant Vocabulary               [3/20] 15%   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│   [Again]    [Hard]    [Good]    [Easy]                    │
│                                                             │
├────────────────────────────────────────────────────────────┤
│ ⚠️ Let's review this concept                                │
├────────────────────────────────────────────────────────────┤
│ 📖 Lesson Context                                          │
│    "菜单 (cài dān) is essential when ordering. Remember    │
│    that 菜 means dish/cuisine and 单 means list."          │
├────────────────────────────────────────────────────────────┤
│ 💡 About this word                                         │
│    Literally means "dish list". Used in all Chinese        │
│    restaurants. Don't confuse with 点菜 (ordering).        │
├────────────────────────────────────────────────────────────┤
│ 🔗 Related Cards (click to view)                           │
│    ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│    │ 点菜      │  │ 服务员    │  │ 结账      │              │
│    │ order    │  │ waiter    │  │ pay bill │              │
│    └──────────┘  └──────────┘  └──────────┘              │
├────────────────────────────────────────────────────────────┤
│                        [Continue]                           │
└────────────────────────────────────────────────────────────┘
```

---

#### SuggestLessonsModal

**UI**:
```
┌──────────────────────────────────────────────────────────────┐
│  AI Lesson Suggestions                                  [✕]  │
├──────────────────────────────────────────────────────────────┤
│  Analyzed 147 cards. Here are 4 suggested lessons:          │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 📚 HSK 1 Core Vocabulary                               │ │
│  │ 23 cards                                               │ │
│  │                                                         │ │
│  │ Rationale: Essential HSK-1 level words covering basic  │ │
│  │ daily conversation topics.                             │ │
│  │                                                         │ │
│  │ Cards: 你好, 谢谢, 再见, 是, 不是, ...and 18 more       │ │
│  │                                                         │ │
│  │ [View All Cards]  [Modify]  [Accept] [Skip]           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🍜 Food & Restaurant Vocabulary                        │ │
│  │ 18 cards                                               │ │
│  │                                                         │ │
│  │ Rationale: Practical vocabulary for dining out and    │ │
│  │ discussing food preferences.                           │ │
│  │                                                         │ │
│  │ ...                                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Close]                                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## AI Integration

### AI Prompts Library

**Location**: `/src/lib/lesson-ai-prompts.ts`

```typescript
export const SUGGEST_LESSONS_PROMPT = `
You are a Chinese language learning expert. Analyze the following flashcards
and suggest optimal lesson groupings for a structured learning path.

Cards:
{cards}

Requirements:
- Create 3-5 lesson suggestions
- Group cards by related topics, HSK level, or grammar patterns
- Each lesson should have 10-30 cards for optimal learning
- Provide a concise, descriptive title for each lesson
- Include a brief rationale explaining why these cards belong together
- Consider pedagogical progression (introduce simple concepts before complex)
- Prioritize practical, thematic groupings over arbitrary divisions

Return JSON format:
{
  "suggestions": [
    {
      "title": "Lesson title (max 50 chars)",
      "rationale": "Brief explanation (max 150 chars)",
      "cardIndices": [0, 3, 7, 12, ...]
    }
  ]
}
`

export const EXPAND_LESSON_PROMPT = `
You are expanding a Chinese language lesson.

Current lesson: "{lessonTitle}"
Current cards:
{currentCards}

Available unassociated cards:
{availableCards}

Tasks:
1. Identify which existing unassociated cards fit thematically with this lesson
2. Suggest 3-5 new cards that would complement and strengthen this lesson
3. Explain your rationale

Guidelines:
- New cards should fill gaps in the lesson's topic coverage
- Maintain consistent difficulty level with existing cards
- Consider semantic relationships (synonyms, antonyms, related concepts)
- Include practical, commonly-used vocabulary

Return JSON:
{
  "existingCardIndices": [2, 5, 8],
  "newCards": [
    {
      "hanzi": "打折",
      "pinyin": "dǎzhé",
      "english": "discount",
      "notes": "Common in shopping contexts. Lit: hit/strike + discount",
      "type": "VOCABULARY",
      "suggestedTags": ["shopping", "HSK-4"]
    }
  ],
  "rationale": "Brief explanation of additions"
}
`

export const GENERATE_LESSON_NOTES_PROMPT = `
Write comprehensive, pedagogical notes for a Chinese language lesson.

Lesson: "{lessonTitle}"
Cards covered:
{cards}

Create structured notes with the following sections:

1. **Introduction** (2-3 sentences)
   - What this lesson covers
   - Why it's important

2. **Key Concepts** (bullet points)
   - Main vocabulary themes
   - Grammar patterns (if applicable)
   - Relationships between words

3. **Usage Tips** (3-4 tips)
   - How to use these words in context
   - Common collocations
   - Formality levels

4. **Common Mistakes** (2-3 points)
   - What learners often confuse
   - How to avoid errors

5. **Cultural Notes** (if relevant)
   - Cultural context for vocabulary
   - When/how native speakers use these

6. **Study Suggestions**
   - Recommended practice activities
   - Mnemonic devices for difficult words

Format in Markdown. Be concise but informative (~300-500 words total).
Write for intermediate English speakers learning Mandarin.
`
```

### Token Management

**Model Selection**:
- **Suggest Lessons**: Claude Sonnet 4.5 (16k tokens max) - Complex analysis
- **Expand Lesson**: Claude Sonnet 4.5 (4k tokens max) - Medium complexity
- **Generate Notes**: Claude Sonnet 4.5 (2k tokens max) - Creative writing

**Cost Optimization**:
- Cache lesson suggestions for 24 hours
- Batch multiple expansion requests
- Rate limit: 10 AI requests per user per hour

---

## Edge Cases & Error Handling

### Edge Case 1: User Tries to Associate Cards Already in Another Lesson

**Scenario**: User selects 10 cards, 3 are already in Lesson 2, wants to add all to Lesson 5.

**Handling**:
- **UI**: Show warning in modal:
  ```
  ⚠️ 3 cards are already in Lesson 2: Shopping Vocabulary

  ○ Keep in original lesson (only add 7 cards)
  ○ Move to new lesson (all 10 cards)
  ```
- **API**: Accept `mode` parameter: `'add'` | `'move'`
- **Database**:
  - `'add'`: Only update cards with `lessonId = null`
  - `'move'`: Update all cards regardless

### Edge Case 2: AI Suggests Lesson with Only 3 Cards

**Scenario**: Not enough related cards for meaningful lesson.

**Handling**:
- **AI Prompt**: Specify minimum 8 cards per lesson
- **Post-processing**: Filter out suggestions with < 8 cards
- **UI**: If < 3 suggestions after filtering, show message:
  ```
  "Not enough unassociated cards to create meaningful lessons.
  Try uploading more notes or manually organizing existing cards."
  ```

### Edge Case 3: Lesson Deleted Mid-Review

**Scenario**: User reviewing Lesson 5, admin deletes it (in multi-user scenario).

**Handling**:
- **Database**: Cards have `onDelete: SetNull` for lesson FK
- **Review Session**: Cards cached at session start, continue normally
- **After Session**: Cards no longer associated, show warning:
  ```
  "⚠️ The lesson you were reviewing has been deleted.
  Your progress has been saved, but cards are no longer grouped."
  ```

### Edge Case 4: Narrative Mode with Only 1 Card in Lesson

**Scenario**: Lesson has insufficient cards for meaningful learning.

**Handling**:
- **UI**: Disable "Learn Lesson" button if < 5 cards
- **Tooltip**: "Lessons need at least 5 cards for narrative mode"
- **Alternative**: Show "Add More Cards" button

### Edge Case 5: Upload Fails After Cards Created

**Scenario**: Cards created successfully, but lesson association API call fails.

**Handling**:
- **Frontend**:
  - Show toast: "Cards created, but lesson association failed"
  - Offer "Retry" button to call association API again
  - Store `cardIds` in localStorage for retry
- **Backend**: Idempotent association endpoint (safe to call multiple times)

### Edge Case 6: AI Returns Malformed JSON

**Scenario**: Claude API returns invalid JSON structure.

**Handling**:
- **Parsing**: Wrap in try-catch
- **Retry**: Attempt to clean and re-parse (remove markdown code blocks)
- **Fallback**: Show error with raw response for debugging
- **User Message**:
  ```
  "AI suggestions failed to generate properly.
  Please try again or create lessons manually."
  ```

### Edge Case 7: User Has 500+ Cards, AI Timeout

**Scenario**: Too many cards to analyze in single request.

**Handling**:
- **API**: Paginate analysis (analyze 100 cards at a time)
- **Streaming**: Use streaming response to show progress
- **UI**: Show progress bar: "Analyzing cards... 100/500"
- **Batching**: Create multiple AI requests, combine results

---

## Testing Strategy

### Unit Tests

**SRS Algorithm (existing, verify not broken)**:
- `calculateSRS()` with lesson-filtered cards
- Verify SRS state transitions work same way

**Related Cards Function**:
```typescript
describe('getRelatedCards', () => {
  it('returns cards with matching tags', () => {
    const card = { hanzi: '菜单', tags: ['food', 'HSK-3'] }
    const lessonCards = [
      { hanzi: '点菜', tags: ['food'] },
      { hanzi: '买', tags: ['shopping'] },
    ]
    const related = getRelatedCards(card, lessonCards)
    expect(related).toContain(lessonCards[0])
    expect(related).not.toContain(lessonCards[1])
  })
})
```

### Integration Tests

**Lesson Association Flow**:
```typescript
describe('POST /api/cards/associate-lesson', () => {
  it('associates multiple cards with lesson', async () => {
    const cards = await createTestCards(3)
    const lesson = await createTestLesson()

    const response = await request(app)
      .post('/api/cards/associate-lesson')
      .send({ cardIds: cards.map(c => c.id), lessonId: lesson.id })

    expect(response.status).toBe(200)
    expect(response.body.updatedCount).toBe(3)

    const updatedCards = await prisma.card.findMany({
      where: { id: { in: cards.map(c => c.id) } }
    })
    updatedCards.forEach(card => {
      expect(card.lessonId).toBe(lesson.id)
    })
  })
})
```

### E2E Tests (Playwright)

**Upload → Lesson Flow**:
```typescript
test('upload notes and create lesson', async ({ page }) => {
  await page.goto('/upload')

  // Paste notes
  await page.fill('textarea', 'Test notes:\n你好 - hello')
  await page.click('button:has-text("Parse with AI")')

  // Wait for parsing
  await page.waitForSelector('text=1 card parsed')

  // Save cards
  await page.click('button:has-text("Save Cards")')

  // Association modal
  await page.waitForSelector('text=Associate with Lesson')
  await page.click('text=Create new lesson')
  await page.fill('input[name="lessonNumber"]', '1')
  await page.fill('input[name="lessonTitle"]', 'Test Lesson')
  await page.click('button:has-text("Associate Cards")')

  // Verify redirect to lesson detail
  await page.waitForURL(/\/lessons\/\w+/)
  await expect(page.locator('h1')).toContainText('Lesson 1: Test Lesson')
})
```

**Narrative Review Flow**:
```typescript
test('review lesson in narrative mode', async ({ page }) => {
  // Setup: Create lesson with 5 cards
  const lesson = await setupTestLesson()

  await page.goto(`/lessons/${lesson.id}`)
  await page.click('button:has-text("Learn Lesson")')

  // Review settings
  await page.waitForSelector('text=Learn by Lesson')
  await page.click('button:has-text("Start Learning")')

  // First card
  await page.waitForSelector('text=Lesson Notes')
  await page.click('.flashcard') // Flip

  // Answer incorrectly
  await page.click('button:has-text("Again")')

  // Verify feedback panel
  await expect(page.locator('text=Let\'s review')).toBeVisible()
  await expect(page.locator('text=Lesson Context')).toBeVisible()
  await expect(page.locator('text=Related Cards')).toBeVisible()
})
```

### Manual Testing Checklist

- [ ] Upload notes without lesson association (skip option)
- [ ] Upload notes and create new lesson
- [ ] Upload notes and add to existing lesson
- [ ] Upload notes with some duplicate cards
- [ ] View lesson detail with 0 cards
- [ ] View lesson detail with 100+ cards
- [ ] Review lesson in standard mode
- [ ] Review lesson in narrative mode
- [ ] Answer correct in narrative mode (verify smooth flow)
- [ ] Answer incorrect in narrative mode (verify feedback panel)
- [ ] Related cards display correctly
- [ ] Multi-select cards in deck, add to lesson
- [ ] Multi-select cards in deck, create new lesson
- [ ] Filter deck by lesson via URL param
- [ ] AI suggest lessons with various deck sizes
- [ ] AI expand lesson with/without available cards
- [ ] AI generate lesson notes
- [ ] Delete lesson (verify cards preserved with lessonId = null)
- [ ] Lesson with prerequisite (future)
- [ ] Lesson ordering drag-and-drop (future)

---

## Future Enhancements

### Phase 4 (Not in Initial Implementation)

1. **Lesson Templates**
   - Pre-built lesson structures for HSK levels 1-6
   - Topic-based templates (travel, business, daily life)
   - Import template and auto-populate with matching cards

2. **Collaborative Lessons** (Multi-User)
   - Share lesson with other users
   - Public lesson library
   - Clone others' lessons
   - Lesson ratings and reviews

3. **Adaptive Learning**
   - AI adjusts lesson difficulty based on user performance
   - Recommends next lesson based on mastery
   - Personalized learning paths

4. **Multimedia Enhancements**
   - Attach images to lessons (visual learning)
   - Audio recordings of lesson intro (native speaker)
   - Video examples for grammar lessons

5. **Gamification**
   - Lesson completion achievements
   - XP bonuses for finishing lessons in streak
   - Leaderboards (lessons completed this month)
   - Badges for lesson types (e.g., "HSK-3 Master")

6. **Advanced Analytics**
   - Time spent per lesson
   - Accuracy trends per lesson
   - Most difficult lessons (aggregate across users)
   - Suggested review frequency per lesson

7. **Export/Import**
   - Export lesson as JSON/Anki deck
   - Import lessons from file
   - Share lesson via link

8. **Lesson Builder UI**
   - Visual drag-and-drop card organizer
   - Timeline view of lesson sequence
   - Card dependency graph (show relationships)

---

## Appendix: Glossary

**SRS (Spaced Repetition System)**: Algorithm that schedules card reviews based on user performance, optimizing long-term retention.

**Card States**:
- **NEW**: Never reviewed before
- **LEARNING**: Being actively learned (short intervals)
- **REVIEW**: In regular review rotation (medium intervals)
- **LEARNED**: Mastered (long intervals, 5+ correct in a row)

**Quality Ratings**:
- **AGAIN (0)**: Completely forgot, reset to 1 day
- **HARD (1)**: Correct but difficult, reduce ease factor
- **GOOD (2)**: Correct with normal difficulty
- **EASY (3)**: Perfect recall, increase interval

**Narrative Mode**: Sequential review mode where cards are presented in a structured order with contextual explanations, rather than random SRS-driven order.

**Related Cards**: Cards within the same lesson that share tags, type, or semantic relationships with the current card.

**Lesson Mastery**: Percentage of cards in a lesson that have reached LEARNED state.

**Prerequisites**: Lessons that must be completed before unlocking a subsequent lesson.

---

## Document Change Log

| Version | Date       | Changes                                  |
|---------|------------|------------------------------------------|
| 1.0     | 2025-12-03 | Initial design document created          |

---

**End of Document**
