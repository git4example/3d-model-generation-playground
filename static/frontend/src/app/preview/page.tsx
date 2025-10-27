"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Box, ArrowRight, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AWSLogo } from "@/components/aws-logo"
import { LoadingAnimation } from "@/components/loading-animation"
import { ContributorsFooter } from "@/components/contributors-footer"
import { assetManagementService } from "@/services/assetManagement"

export default function PreviewPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [modelGenerator, setModelGenerator] = useState<"triposr" | "step1x" | "trellis">("triposr")
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("")
  const [generatedImageS3Uri, setGeneratedImageS3Uri] = useState<string>("")
  const [originalPrompt, setOriginalPrompt] = useState<string>("")
  const [originalUploadedImage, setOriginalUploadedImage] = useState<string>("")
  const [generationType, setGenerationType] = useState<"text" | "image">("text")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    // Get all data from sessionStorage
    const imageUrl = sessionStorage.getItem('generatedImageUrl');
    const s3Uri = sessionStorage.getItem('generatedImageS3Uri');
    const prompt = sessionStorage.getItem('originalPrompt');
    const uploadedImage = sessionStorage.getItem('originalUploadedImage');
    const type = sessionStorage.getItem('generationType') as "text" | "image";
    
    console.log('Preview page loaded - imageUrl:', imageUrl);
    console.log('Preview page loaded - s3Uri:', s3Uri);
    console.log('Preview page loaded - prompt:', prompt);
    console.log('Preview page loaded - type:', type);
    
    if (imageUrl) {
      setGeneratedImageUrl(imageUrl);
    }
    if (s3Uri) {
      setGeneratedImageS3Uri(s3Uri);
    }
    if (prompt) {
      setOriginalPrompt(prompt);
    }
    if (uploadedImage) {
      setOriginalUploadedImage(uploadedImage);
    }
    if (type) {
      setGenerationType(type);
    }
    
    // If no image URL, redirect back to create page
    if (!imageUrl) {
      console.log('No image URL found, redirecting to create page');
      toast({
        title: "No image found",
        description: "Please generate an image first",
        variant: "destructive",
      });
      router.push("/create");
    }
  }, [router, toast])

  const handleGoBack = () => {
    // Navigate back to create page
    router.push("/create");
  }

  const handleGenerate3D = async () => {
    setIsGenerating(true)
    
    try {
      const s3Uri = generatedImageS3Uri;
      
      if (!s3Uri) {
        throw new Error('No S3 URI found. Please generate an image first.');
      }
      
      console.log('Starting 3D generation with S3 URI:', s3Uri);
      
      // Call all 3 services with S3 URI - backend returns complete results (no polling needed)
      const results = await Promise.allSettled([
        assetManagementService.generate3D({
          service: 'triposr',
          s3_uri: s3Uri,
          model_save_format: 'glb'
        }),
        assetManagementService.generate3D({
          service: 'stable-3dgen',
          s3_uri: s3Uri,
          model_save_format: 'glb'
        }),
        assetManagementService.generate3D({
          service: 'direct3d-s2',
          s3_uri: s3Uri,
          model_save_format: 'obj'
        })
      ]);
      
      console.log('3D generation results:', results);
      
      // Store job data for model page
      const jobData = {
        triposr: results[0].status === 'fulfilled' ? results[0].value : null,
        stable3dgen: results[1].status === 'fulfilled' ? results[1].value : null,
        direct3ds2: results[2].status === 'fulfilled' ? results[2].value : null,
        errors: {
          triposr: results[0].status === 'rejected' ? results[0].reason : null,
          stable3dgen: results[1].status === 'rejected' ? results[1].reason : null,
          direct3ds2: results[2].status === 'rejected' ? results[2].reason : null,
        }
      };
      
      sessionStorage.setItem('3dModelResults', JSON.stringify(jobData));
      
      // Check if at least one service succeeded
      const successCount = results.filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled').length;
      
      if (successCount === 0) {
        throw new Error('All 3D generation services failed. Please try again.');
      }
      
      toast({
        title: "3D models generated",
        description: `${successCount} of 3 models generated successfully`,
      });
      
      router.push("/model");
      
    } catch (error) {
      console.error('3D generation error:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An error occurred during 3D generation",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
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
            <Link href="/create">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-12">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
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
              <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-secondary/30">
                2
              </div>
              <span className="text-sm font-medium text-secondary">Preview</span>
            </div>
            <div className="w-16 h-0.5 bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
                3
              </div>
              <span className="text-sm text-muted-foreground">3D Model</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-2 md:space-y-3">
            <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-secondary to-chart-3 bg-clip-text text-transparent">
              Review Your Image
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg">Check the result and proceed to 3D generation</p>
          </div>

          {/* Comparison Cards - Side by side on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* Original Input */}
            <Card className="border-secondary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-4 md:p-6 shadow-xl">
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-xs md:text-sm font-bold">
                    i
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-secondary">Your Original Input</h3>
                </div>
                
                {generationType === "text" ? (
                  <div className="p-3 md:p-4 rounded-lg border border-border/50 bg-muted/30">
                    <p className="text-sm text-foreground">{originalPrompt}</p>
                  </div>
                ) : (
                  <div className="aspect-square md:aspect-video rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                    {originalUploadedImage ? (
                      <img src={originalUploadedImage} alt="Original uploaded image" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <p className="text-sm">No uploaded image</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Generated Image Preview */}
            <Card className="border-secondary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-4 md:p-6 shadow-xl">
              <div className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-chart-3/20 text-chart-3 flex items-center justify-center text-xs md:text-sm font-bold">
                    ✨
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-chart-3">Generated Result</h3>
                </div>
                
                <div className="aspect-square md:aspect-video rounded-lg overflow-hidden border-2 border-chart-3/20 shadow-lg bg-muted/30">
                  {generatedImageUrl ? (
                    <img src={generatedImageUrl} alt="Generated preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm">Loading image...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Go Back Button - Outside of cards */}
          <div className="w-full">
            <Button
              onClick={handleGoBack}
              className="w-full bg-white border border-primary/20 hover:bg-gray-50 shadow-xl text-primary hover:text-primary/80 text-sm md:text-base font-medium py-3 md:py-4 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>

          {/* 3D Generation Settings */}
          <Card className="border-secondary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-8 shadow-xl">
            {isGenerating ? (
              <LoadingAnimation message="Generating 3D models with TripoSR, Step1X-3D, and Microsoft Trellis..." />
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Generate 3D Models</h3>
                  <p className="text-sm text-muted-foreground">
                    We'll generate your asset using all three models: TripoSR, Step1X-3D, and Microsoft Trellis
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <h4 className="font-semibold text-foreground">TripoSR</h4>
                    <p className="text-xs text-muted-foreground">Fast generation ~30s</p>
                  </div>
                  <div className="p-4 rounded-lg border border-secondary/20 bg-secondary/5 text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-lg bg-secondary/10 flex items-center justify-center">
                      <span className="text-2xl">✨</span>
                    </div>
                    <h4 className="font-semibold text-foreground">Step1X-3D</h4>
                    <p className="text-xs text-muted-foreground">Detailed ~2min</p>
                  </div>
                  <div className="p-4 rounded-lg border border-chart-3/20 bg-chart-3/5 text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-lg bg-chart-3/10 flex items-center justify-center">
                      <span className="text-2xl">🎯</span>
                    </div>
                    <h4 className="font-semibold text-foreground">Trellis</h4>
                    <p className="text-xs text-muted-foreground">Production ~3min</p>
                  </div>
                </div>

                <Button
                  onClick={handleGenerate3D}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-secondary to-chart-3 hover:opacity-90 text-white shadow-lg shadow-secondary/30 h-12 text-base"
                  size="lg"
                >
                  Generate All 3D Models
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>

      <ContributorsFooter />
    </div>
  )
}
