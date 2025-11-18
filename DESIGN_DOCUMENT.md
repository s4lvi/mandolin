# Mandolin - Mandarin Language Learning Flashcard Application

## Design Document

---

## 1. Project Overview

### 1.1 Purpose
Mandolin is a Next.js web application designed to aid in Mandarin Chinese language study. It allows users to upload lesson notes for AI-powered parsing into flashcards, manually create and edit flashcards, and review their deck with configurable study modes.

### 1.2 Core Features
- **AI-Powered Note Parsing**: Upload lesson notes and automatically generate flashcards for vocabulary and grammar points
- **Manual Card Management**: Create, edit, and delete flashcards manually
- **Smart Deck Organization**: Cards tagged by lesson number and AI-generated categories
- **Flexible Review Modes**: Choose card face display (pinyin, hanzi, both, or English)
- **AI Example Sentences**: Generate contextual sentences for grammar points during review
- **User Authentication**: Email-based signup and login
- **Duplicate Detection**: Prevent duplicate cards when parsing notes

### 1.3 Target Users
Mandarin language learners who take regular lessons and want to systematically review vocabulary and grammar points.

---

## 2. Tech Stack

### 2.1 Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (built on Radix UI)
- **State Management**: React Query (TanStack Query) for server state
- **Forms**: React Hook Form with Zod validation

### 2.2 Backend
- **Runtime**: Next.js API Routes (Route Handlers)
- **Database**: PostgreSQL (hosted on Supabase or Neon)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5 (Auth.js) with credentials provider

### 2.3 AI Integration
- **Primary**: Anthropic Claude API (claude-sonnet-4-5-20250929)
- **Use Cases**:
  - Parse lesson notes into structured flashcard data
  - Generate tags/categories for cards
  - Create example sentences for grammar points

### 2.4 Deployment
- **Platform**: Vercel
- **Database Hosting**: Supabase (PostgreSQL)
- **Environment Variables**: Vercel environment configuration

### 2.5 Rationale
- **Next.js**: Full-stack React framework with excellent Vercel integration
- **Prisma + PostgreSQL**: Type-safe database access with relational data support
- **NextAuth.js**: Battle-tested auth solution with built-in session management
- **Tailwind + shadcn/ui**: Rapid UI development with accessible, customizable components
- **Claude API**: Excellent at structured data extraction and Chinese language understanding

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
User (1) ----< (N) Deck (1) ----< (N) Card
                    |
                    v
              Lesson (1) ----< (N) Card

Card (N) >----< (N) Tag
```

### 3.2 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  decks         Deck[]
  sessions      Session[]
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Deck {
  id          String   @id @default(cuid())
  name        String   @default("My Deck")
  description String?
  userId      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards       Card[]
  lessons     Lesson[]
}

model Lesson {
  id          String   @id @default(cuid())
  number      Int
  title       String?
  date        DateTime?
  notes       String?  @db.Text
  deckId      String
  createdAt   DateTime @default(now())

  deck        Deck     @relation(fields: [deckId], references: [id], onDelete: Cascade)
  cards       Card[]

  @@unique([deckId, number])
}

model Card {
  id          String    @id @default(cuid())
  hanzi       String
  pinyin      String
  english     String
  notes       String?   @db.Text
  type        CardType  @default(VOCABULARY)
  lessonId    String?
  deckId      String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Spaced repetition fields
  correctCount   Int    @default(0)
  incorrectCount Int    @default(0)
  lastReviewed   DateTime?
  nextReview     DateTime?

  deck        Deck      @relation(fields: [deckId], references: [id], onDelete: Cascade)
  lesson      Lesson?   @relation(fields: [lessonId], references: [id], onDelete: SetNull)
  tags        CardTag[]

  @@unique([deckId, hanzi])
  @@index([deckId])
  @@index([lessonId])
}

model Tag {
  id        String    @id @default(cuid())
  name      String    @unique
  category  String?   // e.g., "part-of-speech", "topic", "hsk-level"

  cards     CardTag[]
}

model CardTag {
  cardId    String
  tagId     String

  card      Card      @relation(fields: [cardId], references: [id], onDelete: Cascade)
  tag       Tag       @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([cardId, tagId])
}

enum CardType {
  VOCABULARY
  GRAMMAR
  PHRASE
  IDIOM
}
```

---

## 4. Application Architecture

### 4.1 Directory Structure

```
mandolin/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── deck/
│   │   │   ├── page.tsx              # View all cards
│   │   │   ├── add/
│   │   │   │   └── page.tsx          # Add cards manually
│   │   │   └── [cardId]/
│   │   │       └── page.tsx          # Edit single card
│   │   ├── upload/
│   │   │   └── page.tsx              # Upload notes
│   │   ├── review/
│   │   │   └── page.tsx              # Review session
│   │   ├── lessons/
│   │   │   └── page.tsx              # View lessons
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── cards/
│   │   │   ├── route.ts              # GET all, POST new
│   │   │   └── [cardId]/
│   │   │       └── route.ts          # GET, PUT, DELETE single
│   │   ├── parse-notes/
│   │   │   └── route.ts              # AI parsing endpoint
│   │   ├── generate-sentence/
│   │   │   └── route.ts              # AI sentence generation
│   │   └── lessons/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── page.tsx                      # Landing page
│   └── globals.css
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── auth/
│   │   ├── login-form.tsx
│   │   └── signup-form.tsx
│   ├── cards/
│   │   ├── card-form.tsx
│   │   ├── card-list.tsx
│   │   ├── card-item.tsx
│   │   └── flashcard.tsx
│   ├── review/
│   │   ├── review-session.tsx
│   │   ├── review-card.tsx
│   │   └── review-settings.tsx
│   ├── upload/
│   │   ├── notes-uploader.tsx
│   │   └── parsed-preview.tsx
│   └── layout/
│       ├── navbar.tsx
│       ├── sidebar.tsx
│       └── footer.tsx
├── lib/
│   ├── prisma.ts                     # Prisma client singleton
│   ├── auth.ts                       # NextAuth configuration
│   ├── ai.ts                         # Claude API utilities
│   ├── utils.ts                      # General utilities
│   └── validations/
│       ├── card.ts
│       └── auth.ts
├── hooks/
│   ├── use-cards.ts
│   ├── use-review.ts
│   └── use-upload.ts
├── types/
│   └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── public/
    └── ...
```

### 4.2 Authentication Flow

1. User signs up with email/password
2. Password hashed with bcrypt
3. Session created via NextAuth.js
4. JWT stored in HTTP-only cookie
5. Protected routes check session server-side

---

## 5. API Routes Specification

### 5.1 Authentication

```typescript
// POST /api/auth/signup
Request: { email: string, password: string, name?: string }
Response: { user: User } | { error: string }

// POST /api/auth/signin (NextAuth)
// POST /api/auth/signout (NextAuth)
// GET /api/auth/session (NextAuth)
```

### 5.2 Cards

```typescript
// GET /api/cards
Query: { deckId?: string, lessonId?: string, type?: CardType, tag?: string }
Response: { cards: Card[] }

// POST /api/cards
Request: {
  hanzi: string,
  pinyin: string,
  english: string,
  notes?: string,
  type?: CardType,
  lessonId?: string,
  tags?: string[]
}
Response: { card: Card }

// GET /api/cards/[cardId]
Response: { card: Card }

// PUT /api/cards/[cardId]
Request: Partial<Card>
Response: { card: Card }

// DELETE /api/cards/[cardId]
Response: { success: boolean }

// POST /api/cards/bulk
Request: { cards: CardInput[] }
Response: { cards: Card[], duplicates: string[] }
```

### 5.3 AI Endpoints

```typescript
// POST /api/parse-notes
Request: {
  notes: string,
  lessonNumber?: number,
  lessonTitle?: string
}
Response: {
  cards: ParsedCard[],
  lesson: { number: number, title: string }
}

interface ParsedCard {
  hanzi: string
  pinyin: string
  english: string
  notes?: string
  type: CardType
  suggestedTags: string[]
}

// POST /api/generate-sentence
Request: {
  cardId: string,
  grammarPoint: string
}
Response: {
  sentence: string,
  pinyin: string,
  translation: string
}
```

### 5.4 Lessons

```typescript
// GET /api/lessons
Response: { lessons: Lesson[] }

// POST /api/lessons
Request: { number: number, title?: string, date?: Date, notes?: string }
Response: { lesson: Lesson }
```

### 5.5 Review

```typescript
// POST /api/review/result
Request: { cardId: string, correct: boolean }
Response: { card: Card }

// GET /api/review/due
Query: { limit?: number }
Response: { cards: Card[] }
```

---

## 6. AI Integration Details

### 6.1 Note Parsing Prompt

```typescript
const PARSE_NOTES_PROMPT = `You are a Mandarin Chinese language learning assistant.
Parse the following lesson notes into structured flashcard data.

For each vocabulary word or grammar point, extract:
- hanzi: Chinese characters
- pinyin: Romanization with tone marks (e.g., nǐ hǎo)
- english: English translation/meaning
- notes: Any additional context or usage notes
- type: VOCABULARY, GRAMMAR, PHRASE, or IDIOM
- suggestedTags: Relevant tags (e.g., ["verb", "daily-life", "HSK-2"])

Rules:
1. Use tone marks in pinyin (ā, á, ǎ, à), not numbers
2. For grammar points, include the pattern in hanzi field
3. Be thorough - extract ALL vocabulary and grammar points
4. Provide clear, concise English definitions
5. Add helpful usage notes where relevant

Respond with JSON array of cards only.`;
```

### 6.2 Sentence Generation Prompt

```typescript
const GENERATE_SENTENCE_PROMPT = `Generate a simple example sentence demonstrating this Mandarin grammar point or language pattern.

Grammar/Pattern: {grammarPoint}

Requirements:
1. Use basic HSK 1-3 vocabulary where possible
2. Keep the sentence short (5-10 characters)
3. Clearly demonstrate the grammar pattern
4. Make the context practical/everyday

Respond with JSON:
{
  "sentence": "Chinese characters",
  "pinyin": "with tone marks",
  "translation": "English translation"
}`;
```

### 6.3 AI Utility Functions

```typescript
// lib/ai.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function parseNotes(notes: string, lessonInfo?: LessonInfo) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `${PARSE_NOTES_PROMPT}\n\nLesson Notes:\n${notes}`
    }]
  });

  return JSON.parse(response.content[0].text);
}

export async function generateExampleSentence(grammarPoint: string) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 256,
    messages: [{
      role: "user",
      content: GENERATE_SENTENCE_PROMPT.replace('{grammarPoint}', grammarPoint)
    }]
  });

  return JSON.parse(response.content[0].text);
}
```

---

## 7. UI/UX Specifications

### 7.1 Pages

#### Landing Page (`/`)
- Hero section with app description
- Login/Signup CTAs
- Feature highlights

#### Dashboard (`/deck`)
- Card list with search and filters
- Filter by: lesson, type, tags
- Sort by: created date, last reviewed, alphabetical
- Bulk actions: delete, add tags

#### Add Cards (`/deck/add`)
- Multi-card form (add multiple at once)
- Fields: hanzi, pinyin, english, notes, type, tags
- "Add Another" button
- Submit all button

#### Edit Card (`/deck/[cardId]`)
- Single card edit form
- Delete option
- View card history/stats

#### Upload Notes (`/upload`)
- Text area for pasting notes
- File upload option (.txt, .md)
- Lesson number/title inputs
- "Parse with AI" button
- Preview parsed cards before saving
- Edit parsed cards before committing
- Show duplicates that will be skipped

#### Review (`/review`)
- Settings modal:
  - Card face: pinyin, hanzi, both, english, random
  - Number of cards
  - Filter by lesson/tags
- Flashcard display
- Flip animation
- Correct/Incorrect buttons
- Progress indicator
- "Generate Example" button for grammar cards

#### Lessons (`/lessons`)
- List of lessons with card counts
- View original notes
- Filter deck by lesson

### 7.2 Component Specifications

#### Flashcard Component
```typescript
interface FlashcardProps {
  card: Card;
  faceMode: 'pinyin' | 'hanzi' | 'both' | 'english' | 'random';
  isFlipped: boolean;
  onFlip: () => void;
  exampleSentence?: ExampleSentence;
  onGenerateExample?: () => void;
}
```

- Front: Shows selected face (question)
- Back: Shows all other fields (answer)
- Flip animation (CSS 3D transform)
- For grammar cards: "Show Example" button

#### Card Form Component
```typescript
interface CardFormProps {
  initialData?: Partial<Card>;
  onSubmit: (data: CardInput) => void;
  onCancel?: () => void;
}
```

- Hanzi input with character counter
- Pinyin input with tone mark helper
- English input
- Notes textarea
- Type select dropdown
- Tags multi-select with create option

#### Notes Uploader Component
```typescript
interface NotesUploaderProps {
  onParsed: (cards: ParsedCard[], lesson: Lesson) => void;
}
```

- Drag-and-drop file zone
- Paste text area
- Lesson metadata inputs
- Loading state during AI processing
- Error handling

### 7.3 Review Flow

1. User clicks "Start Review"
2. Settings modal appears
3. User selects face mode and filters
4. Cards fetched and shuffled
5. First card shown (front)
6. User mentally answers
7. User clicks/taps to flip
8. User marks Correct or Incorrect
9. Next card shown
10. Repeat until complete
11. Show session summary

---

## 8. Security Considerations

### 8.1 Authentication
- Passwords hashed with bcrypt (cost factor 12)
- HTTP-only cookies for sessions
- CSRF protection via NextAuth
- Rate limiting on auth endpoints

### 8.2 Authorization
- All API routes check session
- Users can only access their own decks/cards
- Prisma queries always include userId filter

### 8.3 Input Validation
- Zod schemas for all inputs
- Sanitize user content before rendering
- Validate file uploads (type, size)

### 8.4 API Security
- Anthropic API key server-side only
- Rate limit AI endpoints (prevent abuse)
- Error messages don't leak internals

---

## 9. Deployment Configuration

### 9.1 Vercel Setup
- Connect GitHub repository
- Configure environment variables
- Enable automatic deployments on main branch

### 9.2 Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXTAUTH_URL="https://mandolin.vercel.app"
NEXTAUTH_SECRET="..."

# AI
ANTHROPIC_API_KEY="..."

# Optional
RATE_LIMIT_MAX=100
```

### 9.3 Database Setup (Supabase)
1. Create new Supabase project
2. Get connection string
3. Run Prisma migrations
4. Seed initial tags

---

## 10. Future Enhancements (Out of Scope for MVP)

- Spaced repetition algorithm (SM-2 or similar)
- Import/export deck functionality
- Audio pronunciation (TTS)
- Handwriting practice canvas
- Mobile app (React Native)
- Social features (share decks)
- HSK level progression tracking
- Character stroke order animations

---

## 11. Implementation Task List

### Phase 1: Project Setup (Foundation)

1. [ ] Initialize Next.js 14 project with TypeScript
   - `npx create-next-app@latest mandolin --typescript --tailwind --eslint --app`
2. [ ] Install and configure dependencies
   - Prisma, NextAuth.js, React Query, React Hook Form, Zod
   - shadcn/ui CLI and initial components
   - Anthropic SDK
   - bcrypt for password hashing
3. [ ] Set up Prisma with PostgreSQL
   - Create schema.prisma with all models
   - Configure database connection
4. [ ] Create Supabase project and get connection string
5. [ ] Run initial Prisma migration
6. [ ] Create Prisma client singleton (`lib/prisma.ts`)
7. [ ] Set up project structure (folders as defined in 4.1)
8. [ ] Configure Tailwind with custom theme colors
9. [ ] Install shadcn/ui base components (button, input, card, dialog, etc.)

### Phase 2: Authentication System

10. [ ] Configure NextAuth.js with credentials provider
11. [ ] Create auth utility functions (`lib/auth.ts`)
12. [ ] Implement password hashing utilities
13. [ ] Create signup API route with validation
14. [ ] Create Zod validation schemas for auth (`lib/validations/auth.ts`)
15. [ ] Build signup page and form component
16. [ ] Build login page and form component
17. [ ] Create auth layout with centered card design
18. [ ] Implement protected route middleware
19. [ ] Add session provider to root layout
20. [ ] Test complete auth flow (signup → login → logout)

### Phase 3: Core Layout & Navigation

21. [ ] Create main dashboard layout
22. [ ] Build navbar component with user menu
23. [ ] Build sidebar navigation component
24. [ ] Create landing page with hero and features
25. [ ] Add route transitions/loading states
26. [ ] Implement responsive design for mobile

### Phase 4: Card Management - Backend

27. [ ] Create Zod validation schemas for cards (`lib/validations/card.ts`)
28. [ ] Implement GET /api/cards with filters
29. [ ] Implement POST /api/cards for single card
30. [ ] Implement POST /api/cards/bulk for multiple cards
31. [ ] Implement GET /api/cards/[cardId]
32. [ ] Implement PUT /api/cards/[cardId]
33. [ ] Implement DELETE /api/cards/[cardId]
34. [ ] Add duplicate detection logic (by hanzi per deck)
35. [ ] Create lessons API routes (GET, POST)
36. [ ] Seed database with initial tags

### Phase 5: Card Management - Frontend

37. [ ] Create React Query hooks for cards (`hooks/use-cards.ts`)
38. [ ] Build card list component with virtualization
39. [ ] Build card item component
40. [ ] Build card form component with all fields
41. [ ] Create pinyin input with tone mark helper
42. [ ] Build tags multi-select component
43. [ ] Create deck page with search and filters
44. [ ] Build add cards page (multi-card form)
45. [ ] Build edit card page
46. [ ] Add delete confirmation dialog
47. [ ] Implement optimistic updates for better UX

### Phase 6: AI Integration - Note Parsing

48. [ ] Set up Anthropic client (`lib/ai.ts`)
49. [ ] Create note parsing prompt template
50. [ ] Implement parseNotes function with error handling
51. [ ] Create POST /api/parse-notes endpoint
52. [ ] Build notes uploader component (text + file)
53. [ ] Build parsed cards preview component
54. [ ] Add edit capability for parsed cards before saving
55. [ ] Implement duplicate highlighting in preview
56. [ ] Build upload page with full flow
57. [ ] Add loading states and error handling
58. [ ] Test with sample lesson notes

### Phase 7: Review System - Backend

59. [ ] Create POST /api/review/result endpoint
60. [ ] Implement GET /api/review/due endpoint
61. [ ] Create sentence generation prompt template
62. [ ] Implement generateExampleSentence function
63. [ ] Create POST /api/generate-sentence endpoint
64. [ ] Add review statistics tracking

### Phase 8: Review System - Frontend

65. [ ] Create review hooks (`hooks/use-review.ts`)
66. [ ] Build flashcard component with flip animation
67. [ ] Build review settings modal
68. [ ] Build review session component
69. [ ] Implement face mode selection (pinyin/hanzi/both/english/random)
70. [ ] Add correct/incorrect buttons with keyboard shortcuts
71. [ ] Build progress indicator
72. [ ] Implement "Generate Example" button for grammar cards
73. [ ] Build session summary component
74. [ ] Create review page with full flow
75. [ ] Add card shuffle logic
76. [ ] Test complete review flow

### Phase 9: Lessons Management

77. [ ] Build lessons list page
78. [ ] Show card counts per lesson
79. [ ] Add ability to view original notes
80. [ ] Link lessons to deck filters
81. [ ] Add lesson metadata editing

### Phase 10: Polish & UX Improvements

82. [ ] Add toast notifications for actions
83. [ ] Implement loading skeletons
84. [ ] Add keyboard shortcuts (flip, correct, incorrect)
85. [ ] Improve error messages and error boundaries
86. [ ] Add empty states for lists
87. [ ] Implement dark mode support
88. [ ] Add favicon and meta tags
89. [ ] Optimize images and fonts

### Phase 11: Testing & Quality

90. [ ] Set up Jest and React Testing Library
91. [ ] Write unit tests for utility functions
92. [ ] Write integration tests for API routes
93. [ ] Write component tests for critical flows
94. [ ] Test AI parsing with various note formats
95. [ ] Cross-browser testing
96. [ ] Mobile responsiveness testing

### Phase 12: Deployment

97. [ ] Create production database on Supabase
98. [ ] Run migrations on production database
99. [ ] Configure Vercel project
100. [ ] Set up environment variables in Vercel
101. [ ] Deploy to Vercel
102. [ ] Configure custom domain (optional)
103. [ ] Set up monitoring and error tracking
104. [ ] Test production deployment end-to-end

### Phase 13: Documentation & Launch

105. [ ] Write README with setup instructions
106. [ ] Document environment variables
107. [ ] Create sample lesson notes for testing
108. [ ] Final QA pass
109. [ ] Launch!

---

## 12. Development Priorities

### MVP (Must Have)
- User authentication
- Manual card creation/editing
- AI note parsing
- Basic review mode
- Deployment

### Post-MVP (Nice to Have)
- AI example sentences
- Advanced filtering/search
- Spaced repetition
- Dark mode
- Export functionality

---

## Appendix A: Sample Lesson Notes

```
Lesson 5 - Asking for Directions

Vocabulary:
- 在哪儿 (zài nǎr) - where
- 左边 (zuǒbian) - left side
- 右边 (yòubian) - right side
- 前面 (qiánmiàn) - in front
- 后面 (hòumiàn) - behind
- 对面 (duìmiàn) - opposite

Grammar Points:
1. 在 + place - indicates location
   Example: 银行在学校对面 (The bank is opposite the school)

2. Directional complements with 往/向
   往左走 (wǎng zuǒ zǒu) - go left
   向前走 (xiàng qián zǒu) - go forward

Phrases:
- 请问，...在哪儿？- Excuse me, where is...?
- 怎么走？- How do I get there?
```

---

*Document Version: 1.0*
*Created: November 2024*
