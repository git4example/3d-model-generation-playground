"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Box, Smartphone } from "lucide-react"
import { ModelViewer } from "./model-viewer"
import { Badge } from "@/components/ui/badge"

interface ModelPreviewProps {
  modelUrl?: string
  isGenerating: boolean
  modelType: "triposr" | "step1x" | "trellis"
}

export function ModelPreview({ modelUrl, isGenerating, modelType }: ModelPreviewProps) {
  const [activeTab, setActiveTab] = useState("preview")

  const modelInfo = {
    triposr: {
      name: "TripoSR",
      description: "Fast, high-quality 3D reconstruction",
      color: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    },
    step1x: {
      name: "Step1X-3D",
      description: "Advanced detail and texture generation",
      color: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    },
    trellis: {
      name: "Microsoft Trellis",
      description: "Production-ready asset generation",
      color: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    },
  }

  const info = modelInfo[modelType]

  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur overflow-hidden">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">3D Model Preview</h3>
            <p className="text-sm text-muted-foreground mt-1">Your generated 3D model will appear here</p>
          </div>
          <Badge variant="secondary" className={info.color}>
            {info.name}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">
              <Box className="h-4 w-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="model">
              <Smartphone className="h-4 w-4 mr-2" />
              Model
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="mt-0">
          <div className="aspect-square bg-muted/30 relative flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-chart-1" />
                <p className="text-sm text-muted-foreground">Generating 3D model...</p>
              </div>
            ) : modelUrl ? (
              <div className="w-full h-full">
                <ModelViewer src={modelUrl} alt="Generated 3D model" modelType="advanced" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <Box className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Generate an image and 3D model to preview</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="model" className="mt-0">
          <div className="aspect-square bg-muted/30 relative flex items-center justify-center">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-chart-1" />
                <p className="text-sm text-muted-foreground">Generating 3D model...</p>
              </div>
            ) : modelUrl ? (
              <div className="w-full h-full">
                <ModelViewer src={modelUrl} alt="Generated 3D model with AR" modelType="advanced" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                    <Smartphone className="h-3 w-3 mr-1" />
                    AR enabled on mobile
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center px-6">
                <Smartphone className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">View your 3D model in AR on mobile devices</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {modelUrl && !isGenerating && (
        <div className="p-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>About {info.name}:</strong> {info.description}
          </p>
        </div>
      )}
    </Card>
  )
}
