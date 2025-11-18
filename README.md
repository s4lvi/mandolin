# Mangolin - Mandarin Flashcard Study Tool

An AI-powered flashcard application for Mandarin Chinese language learning. Upload your lesson notes and let AI create personalized flashcards, then review them with flexible study modes.

## Features

- **AI-Powered Note Parsing**: Upload lesson notes and automatically generate flashcards for vocabulary, grammar points, and phrases
- **Manual Card Management**: Create, edit, and delete flashcards with fields for hanzi, pinyin, english, and notes
- **Smart Organization**: Cards tagged by lesson number and AI-generated categories
- **Flexible Review Modes**: Choose card face display (pinyin, hanzi, both, english, or random)
- **AI Example Sentences**: Generate contextual example sentences for grammar points
- **User Authentication**: Email-based signup and login

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Anthropic Claude API
- **State Management**: TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or hosted like Supabase/Neon)
- Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/s4lvi/mandolin.git
   cd mandolin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/mandolin"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   ANTHROPIC_API_KEY="sk-ant-..."
   ```

4. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel project settings
4. Deploy

### Database Setup

For production, we recommend using:
- **Supabase**: Free PostgreSQL hosting
- **Neon**: Serverless PostgreSQL

## Usage

### Adding Cards Manually

1. Navigate to "My Deck"
2. Click "Add Cards"
3. Fill in the card details (hanzi, pinyin, english, notes)
4. Click "Add Card" to save

### Uploading Lesson Notes

1. Navigate to "Upload Notes"
2. Optionally enter lesson number and title
3. Paste your lesson notes
4. Click "Parse Notes" - AI will extract flashcards
5. Review and select which cards to add
6. Click "Save Cards"

### Reviewing Cards

1. Navigate to "Review"
2. Configure settings (face mode, number of cards)
3. Click "Start Review"
4. Tap card to flip and reveal answer
5. Mark as Correct or Incorrect
6. For grammar cards, optionally generate example sentences

## Sample Lesson Notes Format

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

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── auth/             # Authentication forms
│   ├── cards/            # Card management components
│   └── review/           # Review session components
├── hooks/                 # React Query hooks
├── lib/                   # Utilities and configurations
└── types/                 # TypeScript types
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
