"use client"

import { useEffect, useRef } from "react"

interface ModelViewerProps {
  src: string
  iosSrc?: string
  poster?: string
  alt: string
  modelType?: string
  className?: string
}

export function ModelViewer({ src, iosSrc, poster, alt, modelType = "default", className }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stableContainer = containerRef.current
    if (!stableContainer) return

    // Wait for model-viewer to be available
    const loadModelViewer = () => {
      if (typeof window !== 'undefined' && (window as any).customElements?.get('model-viewer')) {
        createModelViewer()
      } else {
        // Retry after a short delay
        setTimeout(loadModelViewer, 100)
      }
    }

    const createModelViewer = () => {
      try {
        // Create model-viewer element
        const modelViewer = document.createElement("model-viewer")
        modelViewer.setAttribute("src", src)
        if (iosSrc) {
          modelViewer.setAttribute("ios-src", iosSrc)
        }
        if (poster) {
          modelViewer.setAttribute("poster", poster)
        }
        modelViewer.setAttribute("alt", alt)
        modelViewer.setAttribute("shadow-intensity", "1")
        modelViewer.setAttribute("camera-controls", "")
        modelViewer.setAttribute("auto-rotate", "")
        modelViewer.setAttribute("ar", "")
        modelViewer.setAttribute("ar-modes", "webxr scene-viewer quick-look")
        modelViewer.setAttribute("ar-scale", "auto")
        modelViewer.setAttribute("data-product-id", src.split("/").pop()?.split(".")[0] || "")
        modelViewer.style.width = "100%"
        modelViewer.style.height = "100%"
        modelViewer.style.backgroundColor = "transparent"

        // Conditionally set additional attributes based on model type
        if (modelType === "advanced") {
          modelViewer.setAttribute("environment-image", "neutral")
          modelViewer.setAttribute("exposure", "1")
        }

        // Add error handling
        modelViewer.addEventListener('error', (e) => {
          console.error('Model viewer error:', e)
          stableContainer.innerHTML = `
            <div class="flex items-center justify-center h-full bg-red-50 border-2 border-red-200 rounded-lg">
              <div class="text-center p-4">
                <p class="text-red-600 font-semibold">Failed to load 3D model</p>
                <p class="text-red-500 text-sm mt-1">Check console for details</p>
              </div>
            </div>
          `
        })

        modelViewer.addEventListener('load', () => {
          console.log('Model loaded successfully:', src)
        })

        // Clear container and append model-viewer
        stableContainer.innerHTML = ""
        stableContainer.appendChild(modelViewer)
      } catch (error) {
        console.error('Error creating model viewer:', error)
        stableContainer.innerHTML = `
          <div class="flex items-center justify-center h-full bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <div class="text-center p-4">
              <p class="text-yellow-600 font-semibold">Loading 3D model...</p>
              <p class="text-yellow-500 text-sm mt-1">Please wait</p>
            </div>
          </div>
        `
      }
    }

    loadModelViewer()

    return () => {
      if (stableContainer) {
        stableContainer.innerHTML = ""
      }
    }
  }, [src, iosSrc, poster, alt, modelType])

  return <div ref={containerRef} className={className || "w-full h-full"} />
}
