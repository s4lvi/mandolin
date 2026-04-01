# Mangolin - Mandarin Flashcard Study Tool

An AI-powered flashcard application for Mandarin Chinese language learning. Upload your lesson notes and let AI create personalized flashcards, then master them with spaced repetition and gamified learning.

## Features

### AI-Powered Learning
- **Smart Note Parsing**: Upload lesson notes and automatically generate flashcards for vocabulary, grammar points, phrases, and idioms
- **AI Example Sentences**: Generate contextual example sentences for any card type
- **AI Short Stories**: Read AI-generated stories built from your known vocabulary with sentence-by-sentence audio
- **Character Decomposition**: See radical/component breakdowns for any Chinese character
- **Test Question Generation**: AI creates multiple-choice questions with plausible distractors
- **Interactive AI Lessons**: Multi-page lessons with quizzes, fill-in-the-blank, and translation exercises

### Review & Study Modes
- **Classic Flashcards**: Flip cards with customizable face modes (pinyin, hanzi, both, english, immersion, or random)
- **Recall Mode**: Type your answer from memory with auto-grading and self-rating
- **Listening Mode**: Audio-only card front for sound recognition practice
- **Immersion Mode**: Hanzi + audio only, pinyin hidden behind tap-to-reveal
- **Multiple Choice Tests**: Quiz yourself with AI-generated questions
- **Spaced Repetition System**: SM-2 algorithm schedules reviews at optimal intervals
- **Swipe Gestures**: Swipe left (Again) or right (Good) on flashcards
- **Wrong-Card Drill**: Review missed cards immediately after a session
- **Undo Support**: Undo accidental review ratings

### Progress Tracking & Gamification
- **XP & Levels**: Earn experience points for each review and level up
- **Achievement System**: Unlock achievements for reaching milestones
- **Streak Tracking**: Build and maintain daily study streaks
- **Statistics Dashboard**: Detailed stats including accuracy, cards learned, review history, and 30-day heatmap
- **Daily Goals**: Set and track daily review targets
- **Due Cards Badge**: Navigation badge shows how many cards are due

### Organization & Management
- **Lesson Organization**: Cards automatically tagged by lesson number and organized by topics
- **Short Stories**: AI-generated reading practice saved for re-reading
- **Manual Card Management**: Create, edit, and delete flashcards with full control
- **Tag System**: Categorize cards by HSK level, parts of speech, topics, and custom tags
- **Duplicate Detection**: Prevents duplicate cards when importing
- **Pinyin Toggle**: Show/hide pinyin across the deck view

### User Experience
- **Mobile-First Design**: Bottom tab navigation, touch-optimized buttons, swipe gestures
- **iOS & Android App**: Native app shell via Capacitor (App Store / Play Store ready)
- **OLED-Safe Dark Mode**: Optimized dark colors prevent smearing on OLED screens
- **Haptic Feedback**: Tactile feedback on card flips, correct answers, and gestures (native)
- **Skeleton Loading**: Shimmer placeholders while content loads
- **Optimistic Saves**: Cards save in the background, instant redirect after upload
- **Versioning System**: "What's New" modal for release updates
- **Feedback System**: Report bugs or request features in-app

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **AI**: Anthropic Claude API (Sonnet 4.6)
- **State Management**: TanStack Query (React Query)
- **Mobile**: Capacitor (iOS & Android native shell)

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

Four review modes are available:

- **Classic**: Flip cards and self-rate (Again/Good/Easy on mobile, +Hard on desktop). Swipe left/right as a shortcut.
- **Recall**: Type your answer from memory, auto-graded with fuzzy matching, then self-rate.
- **Listening**: Audio plays with a blank screen. Recall the character from sound alone, then reveal.
- **Test**: AI-generated multiple choice questions.

All modes support filtering by lesson, card type, and tags. The SM-2 algorithm schedules next review automatically. Cards you miss are collected for a drill-again session at the end.

### Reading Stories

1. Navigate to **Stories** (Learn tab on mobile)
2. Click **New Story** to generate a story from your vocabulary
3. Toggle between **Immersion** (hanzi + audio only) and **With Pinyin** modes
4. Tap pill buttons to reveal pinyin or English per sentence
5. Use **Read Aloud** for sentence-by-sentence audio playback
6. Previously generated stories are saved and can be re-read anytime

### Tracking Progress

- **Dashboard**: XP, level, streak, daily goal, card progress breakdown
- **Stats Page**: Accuracy, achievements, review history, 30-day activity heatmap
- **Due Badge**: Navigation bar shows how many cards are due for review

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, signup)
│   ├── (dashboard)/              # Protected routes
│   │   ├── deck/                 # Card deck management
│   │   ├── review/               # Review sessions
│   │   ├── upload/               # Note upload & parsing
│   │   ├── lessons/              # Lesson list, detail, interactive learn
│   │   ├── stories/              # AI-generated reading practice
│   │   ├── stats/                # Statistics & achievements
│   │   └── profile/              # User settings
│   ├── api/                      # API routes
│   │   ├── cards/                # Card CRUD, bulk create, save-parsed
│   │   ├── decompose/            # Character decomposition
│   │   ├── lessons/              # Lesson management & page generation
│   │   ├── review/               # Review session, SRS, due-count
│   │   ├── stories/              # Story generation & listing
│   │   └── ...                   # auth, changelog, feedback, stats, etc.
│   ├── layout.tsx                # Root layout (safe areas, providers)
│   └── page.tsx                  # Landing page (dashboard / marketing)
├── components/
│   ├── layout/                   # Navbar, bottom tab bar
│   ├── review/                   # Flashcard, recall, listening, test, answer buttons
│   ├── ui/                       # shadcn/ui + skeleton, ai-loading
│   ├── cards/                    # Card item, card form
│   ├── lessons/                  # Lesson segments, modals
│   └── ...                       # auth, changelog, feedback, welcome, stories
├── hooks/
│   ├── use-cards.ts             # Card CRUD
│   ├── use-review.ts            # Review session
│   ├── use-swipe.ts             # Touch swipe gestures
│   ├── use-due-count.ts         # Due card count (shared)
│   ├── use-upload.ts            # Note parsing with status
│   └── use-test-questions.ts    # Test question fetching
├── lib/
│   ├── ai.ts                    # Claude API integration
│   ├── capacitor.ts             # Native plugin initialization
│   ├── speech.ts                # Web Speech API (Chinese TTS)
│   ├── srs.ts                   # SM-2 algorithm + interval preview
│   ├── constants.ts             # CLAUDE_MODEL, prompts, config
│   └── ...                      # auth, prisma, logger, error-handler, utils
├── types/                        # TypeScript types
├── prisma/schema.prisma          # Database schema (18 models)
├── capacitor.config.ts           # Capacitor native app config
├── changelogs/                   # Version changelog JSON files
└── docs/CODE_PATTERNS.md         # Development guidelines
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

### Pulling Updates

When pulling changes that include database schema updates:

```bash
# Pull latest changes
git pull

# Regenerate Prisma Client (IMPORTANT!)
npx prisma generate

# Restart dev server
npm run dev
```

> **Note**: Always run `npx prisma generate` after pulling schema changes, or you'll get "Unknown field" errors from Prisma.

## Mobile App (Capacitor)

The app runs as a native iOS/Android app via Capacitor, loading from the production server.

### Development

```bash
# Sync config and plugins to native projects
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio
npx cap open android
```

For local development, update `capacitor.config.ts` to point `server.url` at `http://localhost:3000`.

### Publishing

Requires Apple Developer ($99/yr) and/or Google Play Developer ($25) accounts. The native projects in `ios/` and `android/` are gitignored and generated by `npx cap add ios/android`.

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
- [Capacitor](https://capacitorjs.com/) - Native mobile app shell
