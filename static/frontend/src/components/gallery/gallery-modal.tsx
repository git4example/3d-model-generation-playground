"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { LoadingAnimation } from "@/components/loading-animation"
import { ModelViewer } from "@/components/model-viewer"
import { ImageObject, Model3D } from "@/services/assetManagement"
import { Image, Box } from "lucide-react"

interface GalleryModalProps {
  isOpen: boolean
  onClose: () => void
  images: ImageObject[]
  models: Model3D[]
  isLoading?: boolean
}

export function GalleryModal({ isOpen, onClose, images, models, isLoading }: GalleryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[90vw] md:!max-w-[85vw] lg:!max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Asset Gallery
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Browse your generated images and 3D models
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center py-12">
            <LoadingAnimation message="Loading gallery..." />
          </div>
        ) : (
          <Tabs defaultValue="images" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="images">
                <Image className="h-4 w-4 mr-2" />
                Source Images ({images.length})
              </TabsTrigger>
              <TabsTrigger value="models">
                <Box className="h-4 w-4 mr-2" />
                3D Models ({models.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="images" className="flex-1 overflow-y-auto mt-0">
              {images.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Image className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold text-foreground">No images yet</p>
                  <p className="text-sm text-muted-foreground">Generated images will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                  {images.map((image) => (
                    <Card key={image.job_id} className="group relative overflow-hidden border-2 border-border hover:border-primary transition-all cursor-pointer">
                      <div className="aspect-square relative bg-muted">
                        <img src={image.presigned_url} alt={`Image ${image.job_id}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <p className="text-white text-sm font-medium">View Only</p>
                        </div>
                      </div>
                      <div className="p-3 bg-card">
                        <p className="text-xs text-muted-foreground truncate">{image.s3_key.split('/').pop()}</p>
                        <p className="text-xs text-muted-foreground mt-1">{(image.file_size_bytes / 1024).toFixed(1)} KB</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="models" className="flex-1 overflow-y-auto mt-0">
              {models.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Box className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold text-foreground">No 3D models yet</p>
                  <p className="text-sm text-muted-foreground">Generated 3D models will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                  {models.map((model) => (
                    <Card key={model.job_id} className="group relative overflow-hidden border-2 border-border hover:border-secondary transition-all cursor-pointer">
                      <div className="aspect-square relative bg-gradient-to-br from-black/90 to-secondary/10">
                        {model.download_url ? (
                          <ModelViewer
                            src={model.download_url}
                            alt={`${model.model} Model`}
                            className="w-full h-full"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Box className="h-16 w-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-card">
                        <p className="text-xs font-semibold text-foreground capitalize">{model.model}</p>
                        <p className="text-xs text-muted-foreground mt-1">{model.format.toUpperCase()} • {(model.file_size_bytes / 1024 / 1024).toFixed(1)} MB</p>
                        {model.vertices && <p className="text-xs text-muted-foreground">{model.vertices.toLocaleString()} vertices</p>}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
