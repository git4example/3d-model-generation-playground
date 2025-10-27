import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AssetCategories } from "@/components/asset-categories"
import { ContentGuidelines } from "@/components/content-guidelines"
import { ModelSelector } from "./model-selector"
import { ArrowRight } from "lucide-react"

interface TextTo3DTabProps {
  description: string
  onDescriptionChange: (value: string) => void
  imageModel: string
  onImageModelChange: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function TextTo3DTab({
  description,
  onDescriptionChange,
  imageModel,
  onImageModelChange,
  onGenerate,
  isGenerating,
}: TextTo3DTabProps) {
  return (
    <div className="space-y-6">
      <AssetCategories onSelectCategory={onDescriptionChange} />

      <div className="space-y-3">
        <Label htmlFor="description" className="text-base font-semibold">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="e.g., A medieval iron sword with leather-wrapped handle and silver pommel. Include material, color, and style details for best results."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={6}
          className="resize-none text-base"
        />
        <p className="text-sm text-muted-foreground">
          Be specific about materials, colors, and style. Focus on singular assets, not environments.
        </p>
      </div>

      <ModelSelector value={imageModel} onChange={onImageModelChange} />

      <ContentGuidelines />

      <Button
        onClick={onGenerate}
        disabled={!description || isGenerating}
        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-lg shadow-primary/30 h-12 text-base"
        size="lg"
      >
        Generate Image
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  )
}
