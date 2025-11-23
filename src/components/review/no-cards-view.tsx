import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"

export function NoCardsView() {
  const router = useRouter()

  return (
    <div className="max-w-md mx-auto text-center py-12">
      <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-bold mb-2">No Cards to Review</h2>
      <p className="text-muted-foreground mb-4">
        Add some cards to your deck first
      </p>
      <Button onClick={() => router.push("/deck")}>Go to Deck</Button>
    </div>
  )
}
