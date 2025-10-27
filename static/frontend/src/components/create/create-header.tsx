import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AWSLogo } from "@/components/aws-logo"
import { Box, ArrowLeft, Images } from "lucide-react"

interface CreateHeaderProps {
  onGalleryClick: () => void
}

export function CreateHeader({ onGalleryClick }: CreateHeaderProps) {
  return (
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGalleryClick}
              className="border-primary/20 hover:bg-primary/5"
            >
              <Images className="h-4 w-4 mr-2" />
              Browse Gallery
            </Button>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
