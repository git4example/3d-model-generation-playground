import type React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ContentGuidelines } from "@/components/content-guidelines"
import { ModelSelector } from "./model-selector"
import { ImageUploadZone } from "./image-upload-zone"
import { ArrowRight } from "lucide-react"

interface ImageTo3DTabProps {
  uploadedImage?: string
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  description: string
  onDescriptionChange: (value: string) => void
  imageModel: string
  onImageModelChange: (value: string) => void
  onGenerate: () => void
  isGenerating: boolean
}

export function ImageEditTo3DTab({
  uploadedImage,
  onFileUpload,
  description,
  onDescriptionChange,
  imageModel,
  onImageModelChange,
  onGenerate,
  isGenerating,
}: ImageTo3DTabProps) {
  return (
    <div className="space-y-6">
      <ImageUploadZone uploadedImage={uploadedImage} onFileUpload={onFileUpload} />

      {uploadedImage && (
        <div className="space-y-3">
          <Label htmlFor="image-description" className="text-base font-semibold">
            Description
          </Label>
          <Textarea
            id="image-description"
            placeholder="e.g., enhance this image for 3D generation, make it more detailed, change the color to blue"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            className="resize-none text-base"
          />
          <p className="text-sm text-muted-foreground">
            Describe how you want to modify or enhance the uploaded image for 3D generation.
          </p>
        </div>
      )}

      <ModelSelector value={imageModel} onChange={onImageModelChange} />

      <ContentGuidelines />

      <Button
        onClick={onGenerate}
        disabled={!uploadedImage || isGenerating}
        className="w-full bg-gradient-to-r from-secondary to-chart-3 hover:opacity-90 text-white shadow-lg shadow-secondary/30 h-12 text-base"
        size="lg"
      >
        Generate Image
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  )
}
