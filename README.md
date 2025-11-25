# Mangolin - Mandarin Flashcard Study Tool

An AI-powered flashcard application for Mandarin Chinese language learning. Upload your lesson notes and let AI create personalized flashcards, then master them with spaced repetition and gamified learning.

## Features

### AI-Powered Learning
- **Smart Note Parsing**: Upload lesson notes and automatically generate flashcards for vocabulary, grammar points, phrases, and idioms
- **AI Example Sentences**: Generate contextual example sentences for grammar points using vocabulary you already know
- **Test Question Generation**: AI creates multiple-choice questions with plausible distractors for effective testing

### Review & Study Modes
- **Spaced Repetition System**: SM-2 algorithm automatically schedules reviews at optimal intervals for long-term retention
- **Classic Flashcards**: Flip cards to test yourself with customizable face modes (pinyin, hanzi, both, english, or random)
- **Multiple Choice Tests**: Quiz yourself with AI-generated questions at easy or hard difficulty levels
- **Flexible Filtering**: Review by lesson, card type, tags, or specific card states

### Progress Tracking & Gamification
- **XP & Levels**: Earn experience points for each review and level up as you progress
- **Achievement System**: Unlock achievements for reaching milestones
- **Streak Tracking**: Build and maintain daily study streaks
- **Statistics Dashboard**: Track your progress with detailed stats including accuracy, cards learned, and review history
- **Daily Goals**: Set and track daily review targets

### Organization & Management
- **Lesson Organization**: Cards automatically tagged by lesson number and organized by topics
- **Manual Card Management**: Create, edit, and delete flashcards with full control
- **Tag System**: Categorize cards by HSK level, parts of speech, topics, and custom tags
- **Duplicate Detection**: Prevents duplicate cards when importing or creating new ones

### User Experience
- **Versioning System**: See "What's New" updates when new features are released
- **Feedback System**: Report bugs, request features, or send general feedback directly in the app
- **Dark Mode**: Comfortable viewing in any lighting condition
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **State Management**: TanStack Query (React Query)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or hosted like Supabase)
- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/s4lvi/mandolin.git
   cd mandolin
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file in the root directory:
   ```env
   # Database (Supabase connection pooler)
   DATABASE_URL="postgresql://postgres.xxx:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

   # Direct database connection (for migrations, bypasses pooler)
   DIRECT_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

   # Authentication
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-a-random-secret-here"

   # AI
   ANTHROPIC_API_KEY="sk-ant-api03-..."
   ```

   > **Note**: For Supabase, you need both `DATABASE_URL` (pooler for app connections) and `DIRECT_URL` (direct connection for migrations).

4. **Set up the database:**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Push schema to database
   npx prisma db push

   # Seed database with initial data (optional)
   npx prisma db seed
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open your browser:**

   Navigate to [http://localhost:3000](http://localhost:3000) and create an account to get started!

## Deployment

### Vercel Deployment (Recommended)

1. **Push to GitHub:**
   ```bash
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy

3. **Environment Variables for Production:**

   Add these in your Vercel project settings:
   ```env
   DATABASE_URL=<your-supabase-pooler-url>
   DIRECT_URL=<your-supabase-direct-url>
   NEXTAUTH_URL=<your-production-url>
   NEXTAUTH_SECRET=<generate-random-secret>
   ANTHROPIC_API_KEY=<your-api-key>
   ```

4. **GitHub Secrets for Changelog Action:**

   Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):
   - `DATABASE_URL` - Same as Vercel
   - `DIRECT_URL` - Same as Vercel

### Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your connection strings from Project Settings → Database
3. Use the connection pooler URL for `DATABASE_URL`
4. Use the direct connection URL for `DIRECT_URL`
5. Run migrations: `npx prisma db push`

## Usage

### Creating Cards

**Manual Entry:**
1. Navigate to **My Deck** → **Add Card**
2. Fill in card details (hanzi, pinyin, english, notes, type, tags)
3. Click "Add Card" to save

**AI-Powered Upload:**
1. Navigate to **Upload Notes**
2. Enter lesson number and title (optional)
3. Paste your lesson notes in the text area
4. Click "Parse Notes" - AI extracts flashcards
5. Review the parsed cards, edit if needed
6. Select which cards to save
7. Click "Save Selected Cards"

**Example Lesson Notes Format:**
```
Lesson 5 - Asking for Directions

Vocabulary:
- 在哪儿 (zài nǎr) - where
- 左边 (zuǒbian) - left side
- 右边 (yòubian) - right side

Grammar Points:
1. 在 + place - indicates location
   Example: 银行在学校对面 (The bank is opposite the school)

Phrases:
- 请问，...在哪儿？- Excuse me, where is...?
```

### Reviewing Cards

**Classic Flashcard Mode:**
1. Navigate to **Review**
2. Choose review mode: **Classic**
3. Configure settings:
   - Face mode (what to show on front: pinyin, hanzi, both, english, random)
   - Number of cards
   - Filter by lesson, tags, or card type
4. Click "Start Review"
5. Tap/click to flip card
6. Rate your answer: Again, Hard, Good, or Easy
7. The SM-2 algorithm schedules the next review automatically

**Test Mode:**
1. Navigate to **Review**
2. Choose review mode: **Test** (Easy or Hard difficulty)
3. Configure filters and number of cards
4. AI generates multiple-choice questions
5. Select your answer
6. See if you're correct
7. Click "Next" to continue

### Tracking Progress

- **Dashboard**: View your XP, level, streak, and daily goal progress
- **Stats Page**: See detailed statistics, achievements, and review history
- **Achievements**: Unlock achievements for milestones (First Review, Week Warrior, etc.)

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup)
│   ├── (dashboard)/              # Protected routes (deck, review, upload, etc.)
│   ├── api/                      # API routes
│   │   ├── auth/                 # NextAuth endpoints
│   │   ├── cards/                # Card CRUD operations
│   │   ├── changelog/            # Versioning system
│   │   ├── feedback/             # User feedback
│   │   ├── generate-sentence/    # AI sentence generation
│   │   ├── lessons/              # Lesson management
│   │   ├── parse-notes/          # AI note parsing
│   │   ├── review/               # Review session & SRS
│   │   ├── stats/                # User statistics
│   │   └── test-questions/       # Test question generation
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── auth/                     # Authentication components
│   ├── cards/                    # Card management
│   ├── changelog/                # What's New modal
│   ├── feedback/                 # Feedback system
│   ├── layout/                   # Navbar, sidebar
│   ├── providers/                # Context providers
│   ├── review/                   # Review session components
│   ├── upload/                   # Note upload components
│   └── welcome/                  # Welcome modal
├── hooks/                        # Custom React hooks
│   ├── use-cards.ts             # Card data fetching
│   ├── use-review.ts            # Review session logic
│   └── use-test-questions.ts    # Test question handling
├── lib/                          # Shared utilities
│   ├── ai.ts                    # Claude API integration
│   ├── api-helpers.ts           # API route helpers
│   ├── auth.ts                  # NextAuth configuration
│   ├── error-handler.ts         # Centralized error handling
│   ├── logger.ts                # Structured logging
│   ├── prisma.ts                # Prisma client singleton
│   ├── srs.ts                   # SM-2 algorithm implementation
│   └── utils.ts                 # General utilities
├── types/                        # TypeScript types
│   ├── api-responses.ts         # API response types
│   └── index.ts                 # Shared types
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Database seeding
├── scripts/
│   └── insert-changelog.ts      # Changelog insertion script
├── changelogs/                   # Version changelog files
└── docs/
    └── CODE_PATTERNS.md         # Development guidelines

```

## Development

### Code Patterns

Please review `docs/CODE_PATTERNS.md` for:
- React patterns and component structure
- API route patterns
- Database patterns and optimization
- Error handling
- Security best practices
- Changelog and versioning workflow

### Running Tests

```bash
npm run test        # Run unit tests
npm run test:e2e    # Run end-to-end tests (when available)
```

### Building

```bash
npm run build       # Production build
npm run start       # Start production server
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the patterns in `docs/CODE_PATTERNS.md`
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT

## Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Anthropic Claude](https://www.anthropic.com/) - AI language model
- [Prisma](https://www.prisma.io/) - Database ORM
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [NextAuth.js](https://next-auth.js.org/) - Authentication
