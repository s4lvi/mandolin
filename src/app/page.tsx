import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { BookOpen, Upload, Brain, Tags } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Master Mandarin with
              <span className="text-primary"> AI-Powered</span> Flashcards
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload your lesson notes and let AI create personalized flashcards.
              Build your vocabulary systematically with smart review sessions.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">Sign In</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Everything you need to learn Mandarin
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <Upload className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Smart Note Parsing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Upload your lesson notes and AI automatically creates flashcards
                    for vocabulary, grammar points, and phrases.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <BookOpen className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Flexible Review</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Choose how to study - show pinyin, hanzi, both, or English.
                    Track your progress with each card.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Brain className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>AI Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get AI-generated example sentences for grammar points
                    using vocabulary you already know.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Tags className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Organize by Lesson</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Cards are automatically tagged by lesson number and category.
                    Filter your deck to focus on specific topics.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              Start building your Mandarin vocabulary today
            </h2>
            <p className="text-muted-foreground mb-8">
              Free to use. No credit card required.
            </p>
            <Link href="/signup">
              <Button size="lg">Create Your Account</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          Mandolin - Mandarin Flashcard Study Tool
        </div>
      </footer>
    </div>
  )
}
