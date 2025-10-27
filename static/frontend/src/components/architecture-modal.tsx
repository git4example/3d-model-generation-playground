"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

export function ArchitectureModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary/30 hover:bg-primary/10 bg-transparent">
          <Info className="h-4 w-4 mr-2" />
          View Architecture
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">AWS Architecture</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-09-25%20at%2011.54.32%E2%80%AFAM-ZuyCd5NMCVsC2Q8PCrleABR6LIZPS0.png"
            alt="AWS Architecture Diagram"
            className="w-full rounded-lg border border-border"
          />
          <div className="space-y-4 text-sm">
            <h4 className="font-bold text-base">How It Works:</h4>
            <ol className="space-y-3 list-decimal list-inside">
              <li>
                <strong>Frontend (NextJS):</strong> User interacts with AWS Amplify hosted frontend with Amazon
                CloudFront and AWS WAF enabled
              </li>
              <li>
                <strong>API Gateway:</strong> Manages API endpoints and triggers AWS Lambda functions for different
                requests
              </li>
              <li>
                <strong>Text-to-Image Lambda:</strong> Performs input validation and prompt engineering before
                generating images
              </li>
              <li>
                <strong>stable-diffusion-3.5-large:</strong> Generates high-quality images from text or image inputs using selected
                models
              </li>
              <li>
                <strong>Image-to-3D Lambda:</strong> Forwards requests to Amazon SQS for 3D rendering queue management
              </li>
              <li>
                <strong>Amazon EKS:</strong> Hosts open-source Image-to-3D models on GPU instances for 3D object
                generation
              </li>
              <li>
                <strong>Amazon S3 & DynamoDB:</strong> Stores 3D object files and metadata for retrieval
              </li>
              <li>
                <strong>3D Object Retrieval Lambda:</strong> Queries DynamoDB and returns presigned S3 URLs
              </li>
              <li>
                <strong>Mobile AR:</strong> 3D objects returned as GLB/USDZ files for AR visualization on mobile devices
              </li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
