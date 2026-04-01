interface SessionHeaderProps {
  currentIndex: number
  totalCards: number
  totalXp: number
  correctCount: number
  incorrectCount: number
  progress: number
}

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`h-2 w-full bg-secondary rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function SessionHeader({
  currentIndex,
  totalCards,
  totalXp,
  correctCount,
  incorrectCount,
  progress
}: SessionHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-1 px-1 space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          {currentIndex + 1} of {totalCards}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-yellow-500">+{totalXp}</span>
          <span className="hidden md:inline text-green-500">{correctCount} correct</span>
          <span className="hidden md:inline text-red-500">{incorrectCount} missed</span>
          <span className="md:hidden text-green-500">{correctCount}</span>
          <span className="md:hidden">/</span>
          <span className="md:hidden text-red-500">{incorrectCount}</span>
        </span>
      </div>
      <ProgressBar value={progress} />
    </div>
  )
}
