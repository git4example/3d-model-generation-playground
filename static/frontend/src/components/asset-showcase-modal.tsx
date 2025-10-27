"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Box } from "lucide-react"
import { ModelViewer } from "@/components/model-viewer"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AssetShowcaseModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-secondary/30 hover:bg-secondary/10 bg-transparent">
          <Box className="h-4 w-4 mr-2" />
          View Asset Showcase
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Asset Showcase</DialogTitle>
          <p className="text-muted-foreground">Explore sample 3D assets and images created with our pipeline</p>
        </DialogHeader>
        
        <Tabs defaultValue="3d" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="3d">3D Models</TabsTrigger>
            <TabsTrigger value="images">Sample Images</TabsTrigger>
          </TabsList>

          <TabsContent value="3d" className="space-y-4">
            <div className="rounded-xl overflow-hidden border-2 border-secondary/20 bg-gradient-to-br from-black/90 to-secondary/10">
              <div className="aspect-video">
                <ModelViewer
                  src="/87beff2c08264a7a887a968f51b1954e_step.glb"
                  alt="Sample 3D Asset"
                  className="w-full h-full"
                />
              </div>
            </div>
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <h4 className="font-bold text-foreground mb-2">Sample Asset - Step1X-3D</h4>
              <p className="text-sm text-muted-foreground">
                This is a real 3D asset generated using the Step1X-3D model. Rotate and zoom to explore the details. 
                On mobile devices, you can view this in AR by tapping the AR button.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Fantasy Sword", image: "/fantasy-sword-game-asset.jpg" },
                { name: "Treasure Chest", image: "/treasure-chest-game-asset.jpg" },
                { name: "Magic Potion", image: "/magic-potion-bottle-game-asset.jpg" },
                { name: "Shield", image: "/medieval-shield-game-asset.jpg" },
              ].map((asset, index) => (
                <div
                  key={index}
                  className="group relative aspect-square rounded-xl overflow-hidden border-2 border-primary/20 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/20"
                >
                  <img src={asset.image || "/placeholder.svg"} alt={asset.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white font-semibold text-sm">{asset.name}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                These game asset images were created using stable-diffusion-3.5-large's generative AI models. 
                Each can be converted into a fully interactive 3D model.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
