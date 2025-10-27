"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SuggestedPrompts } from "@/components/suggested-prompts"
import { ModelComparison } from "@/components/model-comparison"
import { LoadingAnimation } from "@/components/loading-animation"
import { ContributorsFooter } from "@/components/contributors-footer"
import { GalleryModal } from "@/components/gallery/gallery-modal"
import { CreateHeader } from "@/components/create/create-header"
import { CreateProgress } from "@/components/create/create-progress"
import { TextTo3DTab } from "@/components/create/text-to-3d-tab"
import { ImageEditTo3DTab } from "@/components/create/image-edit-to-3d-tab"
import { ImageTo3DTab } from "@/components/create/image-to-3d-tab"
import { useImageGeneration } from "@/hooks/useImageGeneration"
import { Wand2, Upload, Box } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { assetManagementService } from "@/services/assetManagement"

export default function CreatePage() {
  const [activeTab, setActiveTab] = useState<"text" | "image" | "direct">("text")
  const [description, setDescription] = useState("")
  const [uploadedImage, setUploadedImage] = useState<string>()
  const [imageModel, setImageModel] = useState("amazon-nova")
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [galleryData, setGalleryData] = useState<any>(null)
  const [isLoadingGallery, setIsLoadingGallery] = useState(false)
  const { toast } = useToast()

  const { isGenerating, handleGenerate } = useImageGeneration({
    activeTab,
    description,
    uploadedImage,
    imageModel,
  })

  // Fetch gallery data on component mount
  useEffect(() => {
    const fetchGalleryData = async () => {
      setIsLoadingGallery(true)
      try {
        const data = await assetManagementService.getGalleryDataNew(20)
        setGalleryData(data)
      } catch (error) {
        console.error('Error fetching gallery data:', error)
        toast({
          title: "Failed to load gallery",
          description: "Unable to fetch gallery data. You can still create new assets.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingGallery(false)
      }
    }

    fetchGalleryData()
  }, [toast])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
        toast({
          title: "Image uploaded",
          description: "Your image is ready for processing",
        })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <CreateHeader onGalleryClick={() => setIsGalleryOpen(true)} />

      <main className="container mx-auto px-4 py-6 md:py-12">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          <CreateProgress />

          {/* Title */}
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Create Your Gaming Asset
            </h2>
            <p className="text-muted-foreground text-lg">Describe your game asset or upload an image to get started</p>
          </div>

          {/* Main Card */}
          <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-6 md:p-8 shadow-xl">
            {isGenerating ? (
              <LoadingAnimation message="Generating your image..." />
            ) : (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "text" | "image" | "direct")}>
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50">
                  <TabsTrigger value="text" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                    <Wand2 className="h-4 w-4 mr-2" />
                    Text to 3D
                  </TabsTrigger>
                  <TabsTrigger
                    value="image"
                    className="data-[state=active]:bg-secondary data-[state=active]:text-white"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Image to 3D
                  </TabsTrigger>
                  <TabsTrigger
                    value="direct"
                    className="data-[state=active]:bg-chart-3 data-[state=active]:text-white"
                  >
                    <Box className="h-4 w-4 mr-2" />
                    Direct Image→3D
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-6">
                  <TextTo3DTab
                    description={description}
                    onDescriptionChange={setDescription}
                    imageModel={imageModel}
                    onImageModelChange={setImageModel}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                  />
                </TabsContent>

                <TabsContent value="image" className="space-y-6">
                  <ImageEditTo3DTab
                    uploadedImage={uploadedImage}
                    onFileUpload={handleFileUpload}
                    description={description}
                    onDescriptionChange={setDescription}
                    imageModel={imageModel}
                    onImageModelChange={setImageModel}
                    onGenerate={handleGenerate}
                    isGenerating={isGenerating}
                  />
                </TabsContent>

                <TabsContent value="direct" className="space-y-6">
                  <ImageTo3DTab />
                </TabsContent>
              </Tabs>
            )}
          </Card>

          {activeTab === "text" && !isGenerating && <SuggestedPrompts onSelectPrompt={setDescription} />}

          <ModelComparison />
        </div>
      </main>

      <ContributorsFooter />

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={galleryData?.images || []}
        models={galleryData?.models || []}
        isLoading={isLoadingGallery}
      />
    </div>
  )
}
