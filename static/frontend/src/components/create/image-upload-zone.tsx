import type React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Upload } from "lucide-react"

interface ImageUploadZoneProps {
  uploadedImage?: string
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function ImageUploadZone({ uploadedImage, onFileUpload }: ImageUploadZoneProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="file-upload" className="text-base font-semibold">
        Upload Image
      </Label>
      <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
        <Input
          id="file-upload"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileUpload}
          className="hidden"
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          {uploadedImage ? (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-primary/20 shadow-lg bg-muted/30">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/90 rounded-full p-3">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-base font-medium text-foreground mb-1">Click to upload a different image</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, or WEBP (max. 10MB)</p>
              </div>
            </div>
          ) : (
            <div className="py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <p className="text-base font-medium text-foreground mb-2">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground">PNG, JPG, or WEBP (max. 10MB)</p>
            </div>
          )}
        </label>
      </div>
    </div>
  )
}
