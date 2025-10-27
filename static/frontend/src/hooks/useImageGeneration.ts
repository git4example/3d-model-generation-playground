import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface UseImageGenerationProps {
  activeTab: "text" | "image" | "direct"
  description: string
  uploadedImage?: string
  imageModel: string
}

export function useImageGeneration({
  activeTab,
  description,
  uploadedImage,
  imageModel,
}: UseImageGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    try {
      let response;
      
      if (activeTab === "text") {
        // NOTE: Image generation (Amazon Nova Canvas, Stable Diffusion 3.5) intentionally uses external API Gateway
        // This is separate from 3D generation which goes through the BFF (Backend for Frontend)
        // TODO: Move to service layer in future refactor for better abstraction and testability
        response = await fetch('https://2l674tqq2l.execute-api.us-west-2.amazonaws.com/prod/generate-text-to-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: description,
            model: imageModel === "amazon-nova" ? "amazon-nova-canvas" : "stable-diffusion-3.5-large"
          }),
        });
      } else {
        // NOTE: Image generation intentionally uses external API Gateway (see comment above)
        response = await fetch('https://2l674tqq2l.execute-api.us-west-2.amazonaws.com/prod/generate-image-to-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_base64: uploadedImage?.split(',')[1] || uploadedImage, // Remove data URL prefix if present
            prompt: description || "enhance this image for 3D generation",
            model: imageModel === "amazon-nova" ? "amazon-nova-canvas" : "stable-diffusion-3.5-large"
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Store the generated image URL in sessionStorage to pass to preview page
      console.log('Storing in sessionStorage - imageUrl:', result.imageUrl);
      console.log('Storing in sessionStorage - s3uri:', result.s3uri);
      
      sessionStorage.setItem('generatedImageUrl', result.imageUrl);
      sessionStorage.setItem('generatedImageS3Uri', result.s3uri);
      sessionStorage.setItem('originalPrompt', description);
      sessionStorage.setItem('originalModel', imageModel === "amazon-nova" ? "amazon-nova-canvas" : "stable-diffusion-3.5-large");
      sessionStorage.setItem('generationType', activeTab);
      if (uploadedImage) {
        sessionStorage.setItem('originalUploadedImage', uploadedImage);
      }
      
      toast({
        title: "Image generated successfully!",
        description: "Redirecting to preview...",
      });
      
      router.push("/preview");
      
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An error occurred while generating the image",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    isGenerating,
    handleGenerate,
  }
}
