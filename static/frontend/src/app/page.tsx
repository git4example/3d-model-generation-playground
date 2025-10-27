"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { AWSLogo } from "@/components/aws-logo"
import { ArchitectureModal } from "@/components/architecture-modal"
import { AssetShowcaseModal } from "@/components/asset-showcase-modal"
import { ContributorsFooter } from "@/components/contributors-footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 relative">
      <div className="fixed inset-0 z-0 opacity-5 pointer-events-none">
        <div className="grid grid-cols-4 gap-4 p-8 h-full">
          {[
            "/fantasy-sword-game-asset.jpg",
            "/treasure-chest-game-asset.jpg",
            "/magic-potion-bottle-game-asset.jpg",
            "/medieval-shield-game-asset.jpg",
            "/fantasy-sword-game-asset.jpg",
            "/treasure-chest-game-asset.jpg",
            "/magic-potion-bottle-game-asset.jpg",
            "/medieval-shield-game-asset.jpg",
          ].map((image, index) => (
            <div key={index} className="aspect-square rounded-xl overflow-hidden">
              <img src={image || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <AWSLogo className="h-8" />
                <div className="h-8 w-px bg-border" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-secondary to-chart-3 flex items-center justify-center shadow-lg shadow-primary/20">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      3D Model Pipeline
                    </h1>
                    <p className="text-xs text-muted-foreground">AI-Powered 3D Generation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-16 space-y-12 md:space-y-16">
          {/* Hero Section */}
          <div className="text-center space-y-6 py-6 md:py-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              Powered by AWS & Generative AI
            </div>
            <h2 className="text-4xl md:text-7xl font-bold bg-gradient-to-r from-primary via-secondary to-chart-3 bg-clip-text text-transparent text-balance leading-tight">
              Level Up Your Asset Pipeline
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
              Transform game development with AWS-powered 3D asset creation. Generate production-ready gaming models
              from text or images in minutes.
            </p>
            <div className="pt-6">
              <Link href="/create">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white shadow-lg shadow-primary/30 text-lg px-8 h-14"
                >
                  Start Creating
                  <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>

          {/* How It Works Section */}
          <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-6 md:p-12 shadow-xl">
            <div className="text-center mb-8 md:mb-12">
              <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How It Works</h3>
              <p className="text-muted-foreground text-base md:text-lg">Create 3D assets in just 3 simple steps</p>
            </div>

            <div className="flex flex-row md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto pb-4 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
              <div className="flex-shrink-0 w-64 md:w-auto relative snap-center">
                <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                    <svg
                      className="h-8 w-8 md:h-10 md:w-10 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      Step 1
                    </div>
                    <h4 className="text-lg md:text-xl font-bold text-foreground">Generate Image</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Describe your game asset or upload an image. AI creates a detailed preview.
                    </p>
                  </div>
                </div>
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-secondary" />
              </div>

              <div className="flex-shrink-0 w-64 md:w-auto relative snap-center">
                <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-secondary to-chart-3 flex items-center justify-center shadow-lg shadow-secondary/30">
                    <svg
                      className="h-8 w-8 md:h-10 md:w-10 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <div className="inline-block px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-bold">
                      Step 2
                    </div>
                    <h4 className="text-lg md:text-xl font-bold text-foreground">Review Image</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Check the result and regenerate if needed. Perfect your vision.
                    </p>
                  </div>
                </div>
                <div className="hidden md:block absolute top-10 -right-4 w-8 h-0.5 bg-gradient-to-r from-secondary to-chart-3" />
              </div>

              <div className="flex-shrink-0 w-64 md:w-auto relative snap-center">
                <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center shadow-lg shadow-chart-3/30">
                    <svg
                      className="h-8 w-8 md:h-10 md:w-10 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <div className="inline-block px-3 py-1 rounded-full bg-chart-3/10 text-chart-3 text-sm font-bold">
                      Step 3
                    </div>
                    <h4 className="text-lg md:text-xl font-bold text-foreground">Create 3D Model</h4>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Turn your image into a production-ready 3D asset. View in AR on mobile.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-8 border-t border-border/50">
              <ArchitectureModal />
              <AssetShowcaseModal />
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-primary/5 backdrop-blur-xl p-6 hover:shadow-lg hover:shadow-primary/10 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <h4 className="font-bold text-foreground text-lg">stable-diffusion-3.5-large</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Generative AI for text-to-image conversion with advanced capabilities
                </p>
              </div>
            </Card>

            <Card className="border-secondary/20 bg-gradient-to-br from-card/80 to-secondary/5 backdrop-blur-xl p-6 hover:shadow-lg hover:shadow-secondary/10 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h4 className="font-bold text-foreground text-lg">Open Source Models</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Step1X-3D, Microsoft Trellis, and TripoSR for image-to-3D workflows
                </p>
              </div>
            </Card>

            <Card className="border-chart-3/20 bg-gradient-to-br from-card/80 to-chart-3/5 backdrop-blur-xl p-6 hover:shadow-lg hover:shadow-chart-3/10 transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-chart-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                    />
                  </svg>
                </div>
                <h4 className="font-bold text-foreground text-lg">AWS Infrastructure</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  EC2, Lambda, and S3 for scalable, cost-optimized cloud workloads
                </p>
              </div>
            </Card>
          </div>
        </main>

        <ContributorsFooter />
      </div>
    </div>
  )
}
