"use client"

import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void
}

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  const prompts = [
    "A medieval iron sword with leather-wrapped handle and silver pommel",
    "Wooden treasure chest with brass hinges and lock, slightly weathered",
    "Blue magic potion bottle with glowing liquid and cork stopper",
    "Round wooden shield with iron rim and leather straps",
    "Ancient spell book with leather cover and golden clasp",
    "Crystal gem with faceted surface, glowing with inner light",
    "Iron key with ornate handle and rusty patina",
    "Health potion in red glass vial with wax seal",
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-chart-1" />
        <h3 className="text-sm font-medium text-foreground">Suggested Gaming Asset Prompts</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {prompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            className="justify-start text-left h-auto py-3 px-4 hover:bg-accent hover:border-chart-1/50 transition-colors bg-transparent"
            onClick={() => onSelectPrompt(prompt)}
          >
            <span className="text-sm text-muted-foreground line-clamp-2">{prompt}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
