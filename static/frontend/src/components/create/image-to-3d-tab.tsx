"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDirectImageUpload } from "@/hooks/useDirectImageUpload"
import { ImageTo3DLoading } from "./image-to-3d-loading"
import { ImageTo3DResults } from "./image-to-3d-results"

export function ImageTo3DTab() {
  const router = useRouter()
  const {
    uploadedImage,
    imagePreview,
    isGenerating,
    generationResults,
    handleFileUpload,
    handleGenerate,
    resetUpload,
  } = useDirectImageUpload()

  const hasResults = Object.keys(generationResults).length > 0

  const handleViewAllModels = () => {
    // Store results and navigate to model page
    const modelData = {
      triposr: generationResults.triposr?.status === 'fulfilled' ? generationResults.triposr.value : null,
      stable3dgen: generationResults.stable3dgen?.status === 'fulfilled' ? generationResults.stable3dgen.value : null,
      direct3ds2: generationResults.direct3ds2?.status === 'fulfilled' ? generationResults.direct3ds2.value : null,
      errors: {
        triposr: generationResults.triposr?.status === 'rejected' ? generationResults.triposr.reason : null,
        stable3dgen: generationResults.stable3dgen?.status === 'rejected' ? generationResults.stable3dgen.reason : null,
        direct3ds2: generationResults.direct3ds2?.status === 'rejected' ? generationResults.direct3ds2.reason : null,
      }
    }
    sessionStorage.setItem('3dModelResults', JSON.stringify(modelData))
    router.push('/model')
  }

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <div className="space-y-3">
        <Label htmlFor="direct-file-upload" className="text-base font-semibold">
          Upload Image for Direct 3D Generation
        </Label>
        <div className="border-2 border-dashed border-chart-3/30 rounded-xl p-6 text-center hover:border-chart-3/50 hover:bg-chart-3/5 transition-all">
          <Input
            id="direct-file-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
          <label htmlFor="direct-file-upload" className="cursor-pointer block">
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-chart-3/20 shadow-lg bg-muted/30">
                  <img
                    src={imagePreview}
                    alt="Uploaded"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-3">
                      <Upload className="h-6 w-6 text-chart-3" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-base font-medium text-foreground mb-1">Click to upload a different image</p>
                  <p className="text-sm text-muted-foreground">PNG, JPG, JPEG, or WEBP (max. 10MB)</p>
                </div>
              </div>
            ) : (
              <div className="py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center shadow-lg shadow-chart-3/20">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                <p className="text-base font-medium text-foreground mb-2">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, JPEG, or WEBP (max. 10MB)</p>
              </div>
            )}
          </label>
        </div>
      </div>

      {/* Info Section - Show when no generation in progress and no results */}
      {!isGenerating && !hasResults && (
        <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
          <p className="text-sm text-foreground">
            <strong className="text-chart-3">Direct Image→3D:</strong> Upload an image and generate 3D models with all three services (TripoSR, Stable3DGen, Direct3D-S2) in parallel. View results side-by-side as they complete.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && <ImageTo3DLoading results={generationResults} />}

      {/* Results State */}
      {!isGenerating && hasResults && (
        <ImageTo3DResults
          results={generationResults}
          onViewAllModels={handleViewAllModels}
          onGenerateAnother={resetUpload}
        />
      )}

      {/* Generate Button - Show when no generation in progress and no results */}
      {!isGenerating && !hasResults && (
        <Button
          onClick={handleGenerate}
          disabled={!uploadedImage || isGenerating}
          className="w-full bg-gradient-to-r from-chart-3 to-chart-4 hover:opacity-90 text-white shadow-lg shadow-chart-3/30 h-12 text-base"
          size="lg"
        >
          Generate 3D Models
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
