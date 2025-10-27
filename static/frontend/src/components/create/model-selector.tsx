import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ModelSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="image-model" className="text-base font-semibold">
        Image Generation Model
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="image-model" className="h-auto min-h-[60px] bg-muted/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-w-[calc(100vw-2rem)]">
          <SelectItem value="amazon-nova" className="cursor-pointer">
            <div className="flex flex-col items-start py-2 pr-8">
              <span className="font-semibold text-base">Amazon Nova Canvas</span>
              <span className="text-xs text-muted-foreground mt-1 whitespace-normal">
                Latest image generation model with advanced capabilities
              </span>
            </div>
          </SelectItem>
          <SelectItem value="bedrock" className="cursor-pointer">
            <div className="flex flex-col items-start py-2 pr-8">
              <span className="font-semibold text-base">Stable Diffusion 3.5 Large</span>
              <span className="text-xs text-muted-foreground mt-1 whitespace-normal">
                Stable Diffusion 3.5 Large, a model by Stability AI
              </span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
