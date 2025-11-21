# Mandolin Code Patterns & Guidelines

**Last Updated**: 2025-11-21
**Version**: 1.0.0

This living document defines coding standards, patterns, and best practices for the Mandolin Mandarin flashcard learning application. All contributors should follow these guidelines to maintain consistency and code quality.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [File Organization](#file-organization)
4. [Naming Conventions](#naming-conventions)
5. [React Patterns](#react-patterns)
6. [API Route Patterns](#api-route-patterns)
7. [Database Patterns](#database-patterns)
8. [Error Handling](#error-handling)
9. [TypeScript Patterns](#typescript-patterns)
10. [Form Handling](#form-handling)
11. [State Management](#state-management)
12. [Styling Patterns](#styling-patterns)
13. [Security Best Practices](#security-best-practices)
14. [Performance Best Practices](#performance-best-practices)
15. [Code Review Checklist](#code-review-checklist)

---

## Project Overview

Mandolin is a Mandarin Chinese learning application that uses AI-powered flashcard generation and spaced repetition (SRS) to help users build vocabulary systematically.

**Key Features**:
- AI-powered card generation from lesson notes
- Spaced repetition algorithm (SM-2)
- Multiple review modes (classic flashcards, multiple choice tests)
- Achievement system with XP and streaks
- Audio pronunciation using Web Speech API

---

## Tech Stack

### Core
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Runtime**: Node.js
- **Package Manager**: npm

### Frontend
- **UI Framework**: React 19
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Form Handling**: React Hook Form + Zod
- **Theme**: next-themes

### Backend
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **AI**: Anthropic Claude API
- **Password Hashing**: bcryptjs

---

## File Organization

### Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Grouped auth routes
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/              # Grouped dashboard routes
│   │   ├── deck/
│   │   ├── lessons/
│   │   ├── review/
│   │   └── upload/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── cards/
│   │   └── review/
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── auth/                     # Authentication components
│   ├── cards/                    # Card-related components
│   ├── layout/                   # Layout components (navbar, etc.)
│   ├── providers/                # Context providers
│   ├── review/                   # Review session components
│   ├── ui/                       # shadcn/ui components
│   └── upload/                   # Upload-related components
├── hooks/                        # Custom React hooks
│   ├── use-cards.ts
│   ├── use-review.ts
│   └── use-test-questions.ts
├── lib/                          # Utility functions and shared logic
│   ├── constants/                # Constants and configuration
│   ├── ai.ts                     # AI integration (Anthropic)
│   ├── api-helpers.ts            # API route helpers
│   ├── auth.ts                   # NextAuth configuration
│   ├── constants.ts              # App constants
│   ├── env.ts                    # Environment validation
│   ├── logger.ts                 # Structured logging
│   ├── prisma.ts                 # Prisma client instance
│   ├── speech.ts                 # Web Speech API wrapper
│   ├── srs.ts                    # Spaced repetition algorithm
│   └── utils.ts                  # Generic utilities
├── types/                        # TypeScript type definitions
│   ├── api-responses.ts          # API response types
│   └── index.ts                  # Shared types
└── validations/                  # Zod schemas (future)
    └── card.ts

docs/                             # Documentation
├── CODE_PATTERNS.md              # This file
└── API.md                        # API documentation (future)

prisma/
├── schema.prisma                 # Database schema
└── migrations/                   # Database migrations
```

### File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Components | `kebab-case.tsx` | `card-form.tsx`, `navbar.tsx` |
| Pages | `page.tsx` | `app/(dashboard)/deck/page.tsx` |
| API Routes | `route.ts` | `app/api/cards/route.ts` |
| Hooks | `use-*.ts` | `use-cards.ts`, `use-review.ts` |
| Utils | `kebab-case.ts` | `api-helpers.ts`, `srs.ts` |
| Types | `kebab-case.ts` | `api-responses.ts` |
| Constants | `kebab-case.ts` | `review-constants.ts` |

---

## Naming Conventions

### Variables and Functions

```typescript
// ✅ GOOD - Descriptive, camelCase
const userDeck = await getDeck()
const isProcessing = useRef(false)
function calculateNextReview(quality: Quality): Date { }

// ❌ BAD - Unclear, abbreviated
const ud = await getDk()
const proc = useRef(false)
function calcNR(q: Quality): Date { }
```

### Components

```typescript
// ✅ GOOD - PascalCase, descriptive
export function CardItem({ card }: CardItemProps) { }
export function ReviewSessionResults({ stats }: ResultsProps) { }

// ❌ BAD - Vague names
export function Item({ data }: Props) { }
export function Results({ s }: Props) { }
```

### Constants

```typescript
// ✅ GOOD - SCREAMING_SNAKE_CASE for true constants
export const MAX_CARD_LIMIT = 100
export const DEFAULT_DAILY_GOAL = 20
export const SRS_LEARNED_THRESHOLD = 5

// ✅ GOOD - PascalCase for configuration objects
export const SRS_DEFAULTS = {
  INITIAL_EASE_FACTOR: 2.5,
  MIN_EASE_FACTOR: 1.3,
  LEARNED_THRESHOLD: 5
}

// ❌ BAD - Magic numbers in code
const cards = await getCards(20) // What does 20 mean?
```

### Types and Interfaces

```typescript
// ✅ GOOD - PascalCase, descriptive
export interface ReviewResult {
  card: Card
  stats: UserStats
  xpEarned: number
}

export type FaceMode = "pinyin" | "hanzi" | "both" | "english"

// ❌ BAD - Generic names
export interface Result { }
export type Mode = string
```

---

## React Patterns

### Client vs Server Components

**Default to Server Components**, use Client Components only when needed.

#### When to Use Client Components

```typescript
"use client" // Add this directive at the top

// Use Client Components for:
// 1. Event handlers (onClick, onChange, etc.)
// 2. React hooks (useState, useEffect, useRef, etc.)
// 3. Browser APIs (localStorage, Web Speech API, etc.)
// 4. Context providers and consumers
```

**Example - Client Component**:
```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function CardFlashcard({ card }: CardFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div onClick={() => setIsFlipped(!isFlipped)}>
      {isFlipped ? card.english : card.hanzi}
    </div>
  )
}
```

#### When to Use Server Components

```typescript
// Server Components are for:
// 1. Data fetching from database
// 2. Reading environment variables
// 3. Accessing backend resources
// 4. SEO-critical content
// 5. Static content

// Example - Server Component
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

export default async function DeckPage() {
  const session = await auth()
  const cards = await prisma.card.findMany({
    where: { deck: { userId: session.user.id } }
  })

  return <CardList cards={cards} />
}
```

### Component Structure

```typescript
"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"

// 1. Type definitions
interface ReviewCardProps {
  cardId: string
  onAnswer: (correct: boolean) => void
}

// 2. Component function
export function ReviewCard({ cardId, onAnswer }: ReviewCardProps) {
  // 3. Hooks (in order: context, state, refs, queries, effects)
  const { data: card, isLoading } = useQuery({
    queryKey: ["card", cardId],
    queryFn: () => fetchCard(cardId)
  })

  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    // Effect logic
  }, [cardId])

  // 4. Event handlers
  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleAnswer = (correct: boolean) => {
    onAnswer(correct)
  }

  // 5. Early returns for loading/error states
  if (isLoading) return <LoadingSpinner />
  if (!card) return <ErrorMessage />

  // 6. Main render
  return (
    <div onClick={handleFlip}>
      {/* JSX */}
    </div>
  )
}

// 7. Helper components (if small and specific to this file)
function LoadingSpinner() {
  return <div className="animate-spin">Loading...</div>
}
```

### Custom Hooks

```typescript
// ✅ GOOD - Prefix with "use", clear purpose
export function useCards(filters?: CardFilters) {
  return useQuery({
    queryKey: ["cards", filters],
    queryFn: () => fetchCards(filters)
  })
}

export function useReviewSession() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ReviewResult[]>([])

  // Hook logic

  return {
    currentIndex,
    results,
    nextCard,
    submitAnswer
  }
}

// ❌ BAD - Not prefixed with "use"
export function cards() { } // Not a hook pattern
```

### Error Boundaries

**Always wrap pages and complex components with ErrorBoundary**.

```typescript
// app/(dashboard)/review/page.tsx
import { ErrorBoundary } from "@/components/error-boundary"

export default function ReviewPage() {
  return (
    <ErrorBoundary>
      <ReviewSession />
    </ErrorBoundary>
  )
}
```

---

## API Route Patterns

### Route Structure

```typescript
// app/api/cards/route.ts
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"
import { handleRouteError } from "@/lib/error-handler"
import { createLogger } from "@/lib/logger"
import { z } from "zod"

const logger = createLogger("api/cards")

// Request validation schema
const createCardSchema = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().min(1),
  english: z.string().min(1),
  type: z.enum(["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"]),
  notes: z.string().optional()
})

// GET handler
export async function GET(req: Request) {
  try {
    // 1. Authenticate and get user deck
    const { error, deck, userId } = await getAuthenticatedUserDeck()
    if (error) return error

    // 2. Parse and validate query params
    const { searchParams } = new URL(req.url)
    const limit = searchParams.get("limit")
      ? Math.min(100, Math.max(1, parseInt(searchParams.get("limit")!)))
      : 20

    // 3. Database query
    const cards = await prisma.card.findMany({
      where: { deckId: deck.id },
      take: limit,
      orderBy: { createdAt: "desc" }
    })

    // 4. Return response
    return NextResponse.json({ cards })

  } catch (error) {
    logger.error("Failed to fetch cards", { error })
    return handleRouteError(error)
  }
}

// POST handler
export async function POST(req: Request) {
  try {
    const { error, deck } = await getAuthenticatedUserDeck()
    if (error) return error

    const body = await req.json()
    const data = createCardSchema.parse(body)

    const card = await prisma.card.create({
      data: {
        ...data,
        deckId: deck.id
      }
    })

    return NextResponse.json({ card }, { status: 201 })

  } catch (error) {
    logger.error("Failed to create card", { error })
    return handleRouteError(error)
  }
}
```

### Authentication Helper

**Always use the centralized helper**:

```typescript
// ✅ GOOD - Use helper
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"

export async function GET(req: Request) {
  const { error, deck, userId } = await getAuthenticatedUserDeck()
  if (error) return error

  // Continue with deck
}

// ❌ BAD - Duplicate auth logic
export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const deck = await prisma.deck.findFirst({
    where: { userId: session.user.id }
  })
  // ...
}
```

### Input Validation

**Always validate with Zod schemas**:

```typescript
// ✅ GOOD - Zod validation
const updateCardSchema = z.object({
  hanzi: z.string().min(1).optional(),
  pinyin: z.string().min(1).optional(),
  english: z.string().min(1).optional()
})

const body = await req.json()
const data = updateCardSchema.parse(body) // Throws if invalid

// ❌ BAD - Manual validation
const body = await req.json()
if (!body.hanzi || typeof body.hanzi !== "string") {
  return NextResponse.json({ error: "Invalid hanzi" }, { status: 400 })
}
```

### Error Responses

```typescript
// ✅ GOOD - Consistent error handling
import { handleRouteError } from "@/lib/error-handler"

try {
  // Route logic
} catch (error) {
  return handleRouteError(error) // Standardized error response
}

// ❌ BAD - Inconsistent error responses
catch (error) {
  return NextResponse.json(
    { error: "Something went wrong" },
    { status: 500 }
  )
}
```

---

## Database Patterns

### Prisma Client

**Use the singleton instance**:

```typescript
// ✅ GOOD - Import singleton
import prisma from "@/lib/prisma"

const cards = await prisma.card.findMany()

// ❌ BAD - Create new instance
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
```

### Query Optimization

#### Select Only What You Need

```typescript
// ✅ GOOD - Select specific fields
const cards = await prisma.card.findMany({
  select: {
    id: true,
    hanzi: true,
    pinyin: true,
    english: true
  }
})

// ❌ BAD - Select everything
const cards = await prisma.card.findMany() // Returns all fields
```

#### Avoid N+1 Queries

```typescript
// ✅ GOOD - Single query with include
const lessons = await prisma.lesson.findMany({
  include: {
    cards: true,
    _count: { select: { cards: true } }
  }
})

// ❌ BAD - N+1 queries
const lessons = await prisma.lesson.findMany()
for (const lesson of lessons) {
  const cards = await prisma.card.findMany({
    where: { lessonId: lesson.id }
  })
}
```

#### Use Transactions for Multiple Operations

```typescript
// ✅ GOOD - Transaction ensures atomicity
const result = await prisma.$transaction(async (tx) => {
  const card = await tx.card.create({ data: cardData })

  await tx.userStats.update({
    where: { userId },
    data: { totalCards: { increment: 1 } }
  })

  return card
})

// ❌ BAD - Separate operations
const card = await prisma.card.create({ data: cardData })
await prisma.userStats.update({
  where: { userId },
  data: { totalCards: { increment: 1 } }
}) // If this fails, card is created but stats not updated
```

### Using Enums

```typescript
// ✅ GOOD - Use Prisma-generated enums
import { CardState, CardType } from "@prisma/client"

const newCards = await prisma.card.findMany({
  where: {
    state: CardState.NEW,
    type: CardType.VOCABULARY
  }
})

// ❌ BAD - String literals
const newCards = await prisma.card.findMany({
  where: {
    state: "NEW", // Typo not caught
    type: "VOCAB" // Wrong value
  }
})
```

### Upsert for Idempotency

```typescript
// ✅ GOOD - Upsert handles race conditions
const testQuestion = await prisma.testQuestion.upsert({
  where: {
    cardId_direction: { cardId, direction }
  },
  update: {
    timesUsed: { increment: 1 }
  },
  create: {
    cardId,
    direction,
    questionText,
    correctAnswer,
    distractors
  }
})

// ❌ BAD - Create might fail on duplicate
const existing = await prisma.testQuestion.findUnique({
  where: { cardId_direction: { cardId, direction } }
})

if (existing) {
  // Race condition: another request might create between check and update
  await prisma.testQuestion.update({ /* ... */ })
} else {
  await prisma.testQuestion.create({ /* ... */ })
}
```

---

## Error Handling

### Error Boundary Pattern

```typescript
// components/error-boundary.tsx
"use client"

import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### API Error Handler

```typescript
// lib/error-handler.ts
import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { createLogger } from "./logger"

const logger = createLogger("error-handler")

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
  }
}

export function handleRouteError(error: unknown): NextResponse {
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.issues.map(i => ({
          field: i.path.join("."),
          message: i.message
        }))
      },
      { status: 400 }
    )
  }

  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Resource already exists" },
        { status: 409 }
      )
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 }
      )
    }
  }

  // Aborted requests (from prefetch cancellation)
  if (error instanceof Error &&
      (error.message === "aborted" || (error as any).code === "ECONNRESET")) {
    logger.info("Request aborted")
    return NextResponse.json(
      { error: "Request cancelled" },
      { status: 499 }
    )
  }

  // Unknown errors
  logger.error("Unhandled error", { error })

  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  )
}
```

### Try-Catch Best Practices

```typescript
// ✅ GOOD - Specific error handling
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle specific error
  }
  // Re-throw or handle generically
  throw error
}

// ❌ BAD - Silent failure
try {
  await riskyOperation()
} catch (error) {
  // Swallowed error - no logging, no re-throw
}
```

---

## TypeScript Patterns

### Type vs Interface

**Use `interface` for object shapes, `type` for unions/intersections**:

```typescript
// ✅ GOOD - Interface for object shapes
export interface Card {
  id: string
  hanzi: string
  pinyin: string
  english: string
}

// ✅ GOOD - Type for unions
export type FaceMode = "pinyin" | "hanzi" | "both" | "english"

export type CardWithLesson = Card & {
  lesson: Lesson
}

// ✅ GOOD - Type for complex types
export type ApiResponse<T> = {
  data: T
  error: null
} | {
  data: null
  error: string
}
```

### Avoid `any`

```typescript
// ✅ GOOD - Proper typing
function processCard(card: Card): ProcessedCard {
  // ...
}

// ❌ BAD - Using any
function processCard(card: any): any {
  // No type safety
}

// ✅ ACCEPTABLE - Use unknown for truly unknown types
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message)
  }
}
```

### Type Guards

```typescript
// ✅ GOOD - Type guard function
function isCard(value: unknown): value is Card {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "hanzi" in value &&
    "pinyin" in value
  )
}

// Usage
if (isCard(data)) {
  // TypeScript knows data is Card here
  console.log(data.hanzi)
}
```

### Generic Types

```typescript
// ✅ GOOD - Reusable generic types
export interface ApiResponse<T> {
  data: T
  error: null
} | {
  data: null
  error: string
}

// Usage
const response: ApiResponse<Card[]> = await fetchCards()

// ✅ GOOD - Generic function
async function fetchResource<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json() as T
}
```

### Const Assertions

```typescript
// ✅ GOOD - Const assertion for literal types
const REVIEW_MODES = ["classic", "test_easy", "test_hard"] as const
export type ReviewMode = typeof REVIEW_MODES[number]
// Type is: "classic" | "test_easy" | "test_hard"

// ❌ BAD - Loses literal types
const REVIEW_MODES = ["classic", "test_easy", "test_hard"]
// Type is: string[]
```

---

## Form Handling

### React Hook Form with Zod

**Standard pattern for all forms**:

```typescript
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"

// 1. Define Zod schema
const cardSchema = z.object({
  hanzi: z.string().min(1, "Hanzi is required"),
  pinyin: z.string().min(1, "Pinyin is required"),
  english: z.string().min(1, "English translation is required"),
  type: z.enum(["VOCABULARY", "GRAMMAR", "PHRASE", "IDIOM"]),
  notes: z.string().optional()
})

type CardFormData = z.infer<typeof cardSchema>

// 2. Component
export function CardForm({ onSubmit }: CardFormProps) {
  const form = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      hanzi: "",
      pinyin: "",
      english: "",
      type: "VOCABULARY",
      notes: ""
    }
  })

  const handleSubmit = async (data: CardFormData) => {
    try {
      await onSubmit(data)
      form.reset()
    } catch (error) {
      // Handle error
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormField
          control={form.control}
          name="hanzi"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hanzi</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* More fields... */}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Card"}
        </Button>
      </form>
    </Form>
  )
}
```

---

## State Management

### Local State (useState)

```typescript
// ✅ GOOD - Use for component-local UI state
const [isFlipped, setIsFlipped] = useState(false)
const [selectedTags, setSelectedTags] = useState<string[]>([])
```

### Server State (React Query)

```typescript
// ✅ GOOD - Use for data from API
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Query
export function useCards(filters?: CardFilters) {
  return useQuery({
    queryKey: ["cards", filters],
    queryFn: () => fetchCards(filters),
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

// Mutation
export function useCreateCard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCardData) => createCard(data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["cards"] })
    }
  })
}
```

### Global State (Context)

```typescript
// ✅ GOOD - Use for truly global state (theme, auth session)
// Already handled by next-themes and NextAuth

// ❌ AVOID - Don't use Context for:
// - Data fetching (use React Query)
// - Prop drilling one level (just pass props)
```

---

## Styling Patterns

### Tailwind CSS

**Use Tailwind utility classes**:

```typescript
// ✅ GOOD - Tailwind utilities
<div className="flex items-center gap-2 p-4 bg-orange-50 rounded-lg">
  <h2 className="text-xl font-bold">Title</h2>
</div>

// ❌ BAD - Inline styles
<div style={{ display: "flex", padding: "1rem" }}>
  <h2 style={{ fontSize: "1.25rem" }}>Title</h2>
</div>
```

### Color Palette

**Use the mango theme colors**:

```typescript
// Primary colors (orange/yellow/green gradient)
bg-orange-50, bg-orange-500, bg-orange-600
bg-yellow-50, bg-yellow-500, bg-yellow-600
bg-green-50, bg-green-500, bg-green-600

// Gradients
bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500
bg-gradient-to-br from-orange-50/30 via-yellow-50/20 to-green-50/30

// Dark mode variants
dark:from-orange-950/10 dark:via-yellow-950/5
```

### Conditional Classes

```typescript
// ✅ GOOD - Use cn() utility from shadcn
import { cn } from "@/lib/utils"

<div className={cn(
  "base-class",
  isActive && "active-class",
  variant === "primary" && "primary-class"
)} />

// ❌ BAD - String concatenation
<div className={`base-class ${isActive ? "active-class" : ""}`} />
```

---

## Security Best Practices

### Authentication

```typescript
// ✅ GOOD - Always check session in API routes
import { getAuthenticatedUserDeck } from "@/lib/api-helpers"

export async function POST(req: Request) {
  const { error, deck, userId } = await getAuthenticatedUserDeck()
  if (error) return error

  // User is authenticated, deck exists
}

// ❌ BAD - No auth check
export async function POST(req: Request) {
  const body = await req.json()
  // Anyone can call this
}
```

### Input Validation

```typescript
// ✅ GOOD - Validate all inputs with Zod
const schema = z.object({
  cardId: z.string().cuid(),
  quality: z.number().min(0).max(5)
})

const data = schema.parse(body)

// ❌ BAD - Trust user input
const { cardId, quality } = body
await updateCard(cardId, quality) // SQL injection risk
```

### Password Handling

```typescript
// ✅ GOOD - Hash passwords
import bcrypt from "bcryptjs"

const hashedPassword = await bcrypt.hash(password, 10)

// ❌ BAD - Store plaintext
await prisma.user.create({
  data: { email, password } // Never store plaintext
})
```

### Environment Variables

```typescript
// ✅ GOOD - Validate env vars on startup
import { env } from "@/lib/env"

const apiKey = env.ANTHROPIC_API_KEY

// ❌ BAD - Access directly
const apiKey = process.env.ANTHROPIC_API_KEY // Might be undefined
```

---

## Performance Best Practices

### Database

1. **Select only needed fields**
2. **Use `include` instead of multiple queries**
3. **Add indexes for commonly queried fields**
4. **Use transactions for multiple operations**
5. **Batch operations when possible**

### React Query

```typescript
// ✅ GOOD - Proper cache configuration
useQuery({
  queryKey: ["cards", filters],
  queryFn: () => fetchCards(filters),
  staleTime: 1000 * 60 * 5,      // 5 minutes
  gcTime: 1000 * 60 * 30,        // 30 minutes (was cacheTime)
})

// ✅ GOOD - Prefetch for better UX
const queryClient = useQueryClient()

queryClient.prefetchQuery({
  queryKey: ["card", nextCardId],
  queryFn: () => fetchCard(nextCardId)
})
```

### Component Optimization

```typescript
// ✅ GOOD - Memoize expensive computations
import { useMemo } from "react"

const sortedCards = useMemo(() => {
  return cards.sort((a, b) => a.nextReview - b.nextReview)
}, [cards])

// ✅ GOOD - Memoize callbacks
import { useCallback } from "react"

const handleSubmit = useCallback((data: FormData) => {
  // Submit logic
}, [dependency])
```

### Image Optimization

```typescript
// ✅ GOOD - Use Next.js Image component
import Image from "next/image"

<Image
  src="/logo.png"
  alt="Mangolin"
  width={56}
  height={56}
  priority // For above-fold images
/>

// ❌ BAD - Regular img tag
<img src="/logo.png" alt="Mangolin" />
```

---

## Code Review Checklist

Before submitting a PR, ensure:

### Functionality
- [ ] Code works as intended
- [ ] Edge cases handled
- [ ] Error states handled
- [ ] Loading states shown

### Code Quality
- [ ] Follows patterns in this document
- [ ] No duplicate code
- [ ] No magic numbers (use constants)
- [ ] Descriptive variable/function names
- [ ] Comments for complex logic

### TypeScript
- [ ] No `any` types (unless truly necessary)
- [ ] Proper type definitions
- [ ] Enums used instead of string literals
- [ ] Zod schemas for validation

### Performance
- [ ] No N+1 queries
- [ ] Proper React Query cache configuration
- [ ] useMemo/useCallback where appropriate
- [ ] Images optimized

### Security
- [ ] Authentication checked in API routes
- [ ] Input validation with Zod
- [ ] No sensitive data exposed
- [ ] Environment variables validated

### Accessibility
- [ ] Semantic HTML elements
- [ ] Proper ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Color contrast sufficient

### Testing
- [ ] Manual testing completed
- [ ] Unit tests added (when applicable)
- [ ] E2E tests updated (when applicable)

---

## Changelog

### Version 1.0.0 (2025-11-21)
- Initial document creation
- Defined core patterns for React, API routes, database
- Established naming conventions
- Added security and performance best practices

---

**Questions or suggestions?** This is a living document. Propose changes via PR or discussion.
