"use client"

import { Button } from "@/components/ui/button"
import { Sword, Shield, Gem, Scroll, Hammer, Crown } from "lucide-react"

interface AssetCategoriesProps {
  onSelectCategory: (prompt: string) => void
}

export function AssetCategories({ onSelectCategory }: AssetCategoriesProps) {
  const categories = [
    {
      icon: Sword,
      label: "Weapons",
      prompt: "A detailed medieval sword with ornate handle and sharp blade, game-ready asset with metallic materials",
    },
    {
      icon: Shield,
      label: "Armor",
      prompt: "A sturdy wooden shield with metal reinforcements and leather straps, battle-worn texture",
    },
    {
      icon: Gem,
      label: "Collectibles",
      prompt: "A glowing magical crystal with faceted surfaces, emitting soft blue light, fantasy game item",
    },
    {
      icon: Scroll,
      label: "Items",
      prompt: "An ancient scroll with aged parchment and wooden handles, mystical runes visible",
    },
    {
      icon: Hammer,
      label: "Tools",
      prompt: "A blacksmith's hammer with wooden handle and iron head, realistic wear and tear",
    },
    {
      icon: Crown,
      label: "Props",
      prompt: "A golden crown with embedded jewels, ornate design suitable for royalty, high detail",
    },
  ]

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">Quick Start Categories</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {categories.map((category) => {
          const Icon = category.icon
          return (
            <Button
              key={category.label}
              variant="outline"
              onClick={() => onSelectCategory(category.prompt)}
              className="h-auto py-3 px-4 flex flex-col items-center gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">{category.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
