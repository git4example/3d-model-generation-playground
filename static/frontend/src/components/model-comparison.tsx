"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { ChevronDown, ChevronUp } from "lucide-react"

export function ModelComparison() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl shadow-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-foreground">Model Comparison</h3>
            <p className="text-sm text-muted-foreground">Compare image and 3D generation models</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Image Generation Models */}
          <div>
            <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              Image Generation Models
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
                <h5 className="font-semibold text-foreground">Amazon Nova Canvas</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Latest image generation model with advanced capabilities for detailed gaming assets
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">Fast</span>
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                    High Quality
                  </span>
                  <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                    AWS Native
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-muted/30 space-y-2">
                <h5 className="font-semibold text-foreground">stable-diffusion-3.5-large</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Stable and reliable image generation with consistent results
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                    Reliable
                  </span>
                  <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                    Consistent
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3D Generation Models */}
          <div>
            <h4 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <div className="w-1 h-5 bg-secondary rounded-full" />
              3D Generation Models
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border border-secondary/20 bg-secondary/5 space-y-2">
                <h5 className="font-semibold text-foreground">TripoSR</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fast, high-quality 3D reconstruction optimized for speed
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2 py-1 rounded-md bg-secondary/10 text-secondary text-xs font-medium">
                    Fastest
                  </span>
                  <span className="px-2 py-1 rounded-md bg-secondary/10 text-secondary text-xs font-medium">~30s</span>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-chart-3/20 bg-chart-3/5 space-y-2">
                <h5 className="font-semibold text-foreground">Step1X-3D</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Advanced detail and texture generation for complex assets
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2 py-1 rounded-md bg-chart-3/10 text-chart-3 text-xs font-medium">Detailed</span>
                  <span className="px-2 py-1 rounded-md bg-chart-3/10 text-chart-3 text-xs font-medium">~2min</span>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-chart-4/20 bg-chart-4/5 space-y-2">
                <h5 className="font-semibold text-foreground">Microsoft Trellis</h5>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Production-ready asset generation with optimal topology
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-2 py-1 rounded-md bg-chart-4/10 text-chart-4 text-xs font-medium">
                    Production
                  </span>
                  <span className="px-2 py-1 rounded-md bg-chart-4/10 text-chart-4 text-xs font-medium">~3min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
