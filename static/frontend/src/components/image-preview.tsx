"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Wand2, Box } from "lucide-react"
import Image from "next/image"

interface ImagePreviewProps {
  imageUrl?: string
  isGenerating: boolean
  onRegenerate: () => void
  onGenerate3D: () => void
}

export function ImagePreview({ imageUrl, isGenerating, onRegenerate, onGenerate3D }: ImagePreviewProps) {
  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Image Preview</h3>
        <p className="text-sm text-muted-foreground mt-1">Your generated image will appear here</p>
      </div>

      <div className="aspect-square bg-muted/30 relative flex items-center justify-center">
        {isGenerating ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-chart-1" />
            <p className="text-sm text-muted-foreground">Generating image...</p>
          </div>
        ) : imageUrl ? (
          <Image src={imageUrl || "/placeholder.svg"} alt="Generated preview" fill className="object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <Wand2 className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Enter a description (or leave empty) and click Generate</p>
          </div>
        )}
      </div>

      {imageUrl && !isGenerating && (
        <div className="p-4 flex gap-2">
          <Button variant="outline" onClick={onRegenerate} className="flex-1 bg-transparent">
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
          <Button onClick={onGenerate3D} className="flex-1 bg-chart-1 hover:bg-chart-1/90 text-white">
            <Box className="h-4 w-4 mr-2" />
            Generate 3D Model
          </Button>
        </div>
      )}
    </Card>
  )
}
