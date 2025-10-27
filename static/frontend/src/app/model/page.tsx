"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Box, Download, ArrowLeft, Share2, Upload, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ModelViewer } from "@/components/model-viewer"
import { AWSLogo } from "@/components/aws-logo"
import { ContributorsFooter } from "@/components/contributors-footer"

export default function ModelPage() {
  const [activeView, setActiveView] = useState<"preview" | "model">("model")
  const [active3DModel, setActive3DModel] = useState<"triposr" | "step1x" | "trellis">("triposr")
  const [isPublishing, setIsPublishing] = useState(false)
  const [modelData, setModelData] = useState<any>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Load 3D model results from sessionStorage
    const resultsJson = sessionStorage.getItem('3dModelResults');
    if (resultsJson) {
      try {
        const results = JSON.parse(resultsJson);
        console.log('Loaded 3D model results:', results);
        setModelData(results);
      } catch (error) {
        console.error('Error parsing 3D model results:', error);
        toast({
          title: "Error loading models",
          description: "Failed to load 3D model data",
          variant: "destructive",
        });
      }
    } else {
      console.log('No 3D model results found, redirecting to create page');
      toast({
        title: "No models found",
        description: "Please generate 3D models first",
        variant: "destructive",
      });
      router.push("/create");
    }
  }, [router, toast])

  const handleDownload = () => {
    toast({
      title: "Downloading model",
      description: `Downloading ${active3DModel.toUpperCase()} model...`,
    })
  }

  const handleShare = () => {
    toast({
      title: "Share link copied",
      description: "Share this model with your team",
    })
  }

  const handlePublishToMain = async () => {
    setIsPublishing(true)
    // Simulate API call to S3
    setTimeout(() => {
      setIsPublishing(false)
      toast({
        title: "Published to Main",
        description: "Your 3D asset is now available in the centralized asset library for your team to view.",
      })
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-chart-3/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <AWSLogo className="h-8" />
              <div className="h-8 w-px bg-border" />
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-chart-3 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Box className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    3D Model Pipeline
                  </h1>
                  <p className="text-xs text-muted-foreground">AI-Powered 3D Generation</p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Link href="/create">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  New Asset
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                ✓
              </div>
              <span className="text-sm text-muted-foreground">Create</span>
            </div>
            <div className="w-16 h-0.5 bg-primary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-sm font-bold">
                ✓
              </div>
              <span className="text-sm text-muted-foreground">Preview</span>
            </div>
            <div className="w-16 h-0.5 bg-secondary" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-chart-3 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-chart-3/30">
                3
              </div>
              <span className="text-sm font-medium text-chart-3">3D Model</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-chart-3 to-chart-4 bg-clip-text text-transparent">
              Your 3D Models are Ready
            </h2>
            <p className="text-muted-foreground text-lg">Compare all three models and choose your favorite</p>
          </div>

          {/* Model Viewer Card */}
          <Card className="border-chart-3/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl overflow-hidden">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full">
              <div className="border-b border-border/50 bg-muted/30 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-foreground">Visualizer</h3>
                  <TabsList className="bg-muted/50">
                    <TabsTrigger
                      value="preview"
                      className="data-[state=active]:bg-secondary data-[state=active]:text-white"
                    >
                      Preview
                    </TabsTrigger>
                    <TabsTrigger
                      value="model"
                      className="data-[state=active]:bg-chart-3 data-[state=active]:text-white"
                    >
                      Model
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value="preview" className="m-0 p-8">
                <div className="aspect-video rounded-xl overflow-hidden border-2 border-secondary/20 shadow-lg bg-muted/30">
                  <img src="/modern-office-chair.png" alt="2D Preview" className="w-full h-full object-contain" />
                </div>
              </TabsContent>

              <TabsContent value="model" className="m-0 p-8 space-y-6">
                <Tabs value={active3DModel} onValueChange={(v) => setActive3DModel(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                    <TabsTrigger
                      value="triposr"
                      className="data-[state=active]:bg-primary data-[state=active]:text-white"
                    >
                      TripoSR
                    </TabsTrigger>
                    <TabsTrigger
                      value="step1x"
                      className="data-[state=active]:bg-secondary data-[state=active]:text-white"
                    >
                      Step1X-3D
                    </TabsTrigger>
                    <TabsTrigger
                      value="trellis"
                      className="data-[state=active]:bg-chart-3 data-[state=active]:text-white"
                    >
                      Trellis
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="triposr" className="space-y-4">
                    <div className="aspect-video rounded-xl overflow-hidden border-2 border-primary/20 shadow-lg bg-gradient-to-br from-black/90 to-primary/10">
                      <ModelViewer
                        src={modelData?.triposr?.output?.download_url || "https://modelviewer.dev/shared-assets/models/Astronaut.glb"}
                        alt="TripoSR 3D Model"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-foreground">
                        <strong className="text-primary">TripoSR:</strong> Fast generation with good quality. Optimized
                        for speed (~30 seconds). Best for rapid prototyping.
                        {modelData?.errors?.triposr && (
                          <span className="block mt-2 text-destructive">Error: {modelData.errors.triposr.message || 'Generation failed'}</span>
                        )}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="step1x" className="space-y-4">
                    <div className="aspect-video rounded-xl overflow-hidden border-2 border-secondary/20 shadow-lg bg-gradient-to-br from-black/90 to-secondary/10">
                      <ModelViewer
                        src={modelData?.stable3dgen?.output?.download_url || "/87beff2c08264a7a887a968f51b1954e_step.glb"}
                        alt="Stable3DGen Model"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                      <p className="text-sm text-foreground">
                        <strong className="text-secondary">Stable3DGen:</strong> Advanced detail and texture generation.
                        Takes ~2 minutes. Best for complex assets with intricate details.
                        {modelData?.errors?.stable3dgen && (
                          <span className="block mt-2 text-destructive">Error: {modelData.errors.stable3dgen.message || 'Generation failed'}</span>
                        )}
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="trellis" className="space-y-4">
                    <div className="aspect-video rounded-xl overflow-hidden border-2 border-chart-3/20 shadow-lg bg-gradient-to-br from-black/90 to-chart-3/10">
                      <ModelViewer
                        src={modelData?.direct3ds2?.output?.download_url || "https://modelviewer.dev/shared-assets/models/Astronaut.glb"}
                        alt="Direct3D-S2 3D Model"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
                      <p className="text-sm text-foreground">
                        <strong className="text-chart-3">Direct3D-S2:</strong> Production-ready with optimal
                        topology. Takes ~1-2 minutes. Best for game-ready assets with clean geometry.
                        {modelData?.errors?.direct3ds2 && (
                          <span className="block mt-2 text-destructive">Error: {modelData.errors.direct3ds2.message || 'Generation failed'}</span>
                        )}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
                  <p className="text-sm text-foreground">
                    <strong className="text-chart-3">Mobile AR:</strong> On mobile devices, tap the AR button in the
                    viewer to see this model in your space using your camera
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={handlePublishToMain}
              disabled={isPublishing}
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-lg shadow-primary/30 h-12 text-base"
              size="lg"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Publish to Main
                </>
              )}
            </Button>
            <Button
              onClick={handleDownload}
              className="bg-gradient-to-r from-chart-3 to-chart-4 hover:opacity-90 text-white shadow-lg shadow-chart-3/30 h-12 text-base"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Download Model
            </Button>
            <Link href="/create" className="w-full">
              <Button
                variant="outline"
                className="w-full border-chart-3/30 hover:bg-chart-3/10 h-12 text-base bg-transparent"
                size="lg"
              >
                Create Another
              </Button>
            </Link>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-foreground">Publish to Centralized Library</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Click "Publish to Main" to send this 3D asset to your team's centralized S3 bucket. Once published,
                  all team members can view and download this asset from the shared asset library.
                </p>
              </div>
            </div>
          </Card>

          {/* Model Info */}
          <Card className="border-chart-3/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Model Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Active Generator</p>
                <p className="font-semibold text-foreground">{active3DModel.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Format</p>
                <p className="font-semibold text-foreground">
                  {modelData?.[active3DModel === 'step1x' ? 'stable3dgen' : active3DModel === 'trellis' ? 'direct3ds2' : active3DModel]?.output?.format?.toUpperCase() || 'GLB/OBJ'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Vertices</p>
                <p className="font-semibold text-foreground">
                  {modelData?.[active3DModel === 'step1x' ? 'stable3dgen' : active3DModel === 'trellis' ? 'direct3ds2' : active3DModel]?.output?.vertices?.toLocaleString() || '~50K'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">File Size</p>
                <p className="font-semibold text-foreground">
                  {modelData?.[active3DModel === 'step1x' ? 'stable3dgen' : active3DModel === 'trellis' ? 'direct3ds2' : active3DModel]?.output?.file_size_bytes 
                    ? `${(modelData[active3DModel === 'step1x' ? 'stable3dgen' : active3DModel === 'trellis' ? 'direct3ds2' : active3DModel].output.file_size_bytes / 1024 / 1024).toFixed(1)} MB`
                    : '~2.4 MB'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <ContributorsFooter />
    </div>
  )
}
