import { useState, useRef, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { assetManagementService } from "@/services/assetManagement"
import type { GenerationResult } from "@/types/models"

interface UseDirectImageUploadReturn {
  uploadedImage: File | null
  imagePreview: string | undefined
  isGenerating: boolean
  generationResults: {
    triposr?: GenerationResult
    stable3dgen?: GenerationResult
    direct3ds2?: GenerationResult
  }
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleGenerate: () => Promise<void>
  resetUpload: () => void
}

export function useDirectImageUpload(): UseDirectImageUploadReturn {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResults, setGenerationResults] = useState<{
    triposr?: GenerationResult
    stable3dgen?: GenerationResult
    direct3ds2?: GenerationResult
  }>({})
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, JPEG, or WEBP image",
        variant: "destructive",
      })
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    setUploadedImage(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string)
      toast({
        title: "Image uploaded",
        description: "Your image is ready for 3D generation",
      })
    }
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    if (!uploadedImage) return

    // Create new AbortController for this generation
    abortControllerRef.current = new AbortController()
    
    setIsGenerating(true)
    setGenerationResults({})

    try {
      // Step 1: Upload image to S3
      toast({
        title: "Uploading image",
        description: "Uploading your image to S3...",
      })

      const uploadResult = await assetManagementService.uploadImage(uploadedImage)
      
      toast({
        title: "Image uploaded",
        description: "Starting 3D generation with all services...",
      })

      // Step 2: Create handler function that processes each service result immediately
      const handleServiceResult = async (
        servicePromise: Promise<any>,
        serviceKey: 'triposr' | 'stable3dgen' | 'direct3ds2',
        serviceName: string
      ) => {
        try {
          const result = await servicePromise
          
          // ✅ IMMEDIATE ACTION: Update state as soon as this service completes
          setGenerationResults(prev => ({
            ...prev,
            [serviceKey]: {
              status: 'fulfilled',
              value: result
            }
          }))
          
          toast({
            title: `${serviceName} completed`,
            description: "3D model generated successfully",
          })
          
          return { status: 'fulfilled', value: result }
        } catch (error: any) {
          // ❌ IMMEDIATE ACTION: Update state with error
          setGenerationResults(prev => ({
            ...prev,
            [serviceKey]: {
              status: 'rejected',
              reason: error
            }
          }))
          
          toast({
            title: `${serviceName} failed`,
            description: error?.message || 'Generation failed',
            variant: "destructive",
          })
          
          // Return resolved object so Promise.all doesn't break
          return { status: 'rejected', error }
        }
      }

      // Step 3: Start all three services with pre-handling (they run in parallel)
      const s3Uri = uploadResult.s3_uri
      
      const processedPromises = [
        handleServiceResult(
          assetManagementService.generate3D({
            service: 'triposr',
            s3_uri: s3Uri,
            model_save_format: 'glb',
          }),
          'triposr',
          'TripoSR'
        ),
        handleServiceResult(
          assetManagementService.generate3D({
            service: 'stable-3dgen',
            s3_uri: s3Uri,
            model_save_format: 'glb',
          }),
          'stable3dgen',
          'Stable3DGen'
        ),
        handleServiceResult(
          assetManagementService.generate3D({
            service: 'direct3d-s2',
            s3_uri: s3Uri,
            model_save_format: 'glb',
          }),
          'direct3ds2',
          'Direct3D-S2'
        ),
      ]

      // Step 4: Wait for all to complete (but UI already updated progressively!)
      const finalResults = await Promise.all(processedPromises)
      
      // Check if at least one succeeded
      const successCount = finalResults.filter(r => r.status === 'fulfilled').length
      
      if (successCount === 3) {
        toast({
          title: "All models generated!",
          description: "All 3D models are ready to view",
        })
      } else if (successCount > 0) {
        toast({
          title: "Partial success",
          description: `${successCount} of 3 models generated successfully`,
        })
      }

    } catch (error: any) {
      // Don't show error if it was aborted (user navigated away)
      if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        console.log('Generation aborted by user')
        return
      }
      
      console.error('Error in direct 3D generation:', error)
      
      // Provide more specific error messages
      let errorMessage = "An error occurred during 3D generation"
      
      if (error.response?.status === 413) {
        errorMessage = "File too large. Please use a smaller image."
      } else if (error.response?.status === 504) {
        errorMessage = "Generation timeout. The service took too long to respond."
      } else if (error.response?.status === 503) {
        errorMessage = "Backend service unavailable. Please try again later."
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "Request timeout. Please check your network connection."
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Generation failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const resetUpload = () => {
    setUploadedImage(null)
    setImagePreview(undefined)
    setGenerationResults({})
  }

  return {
    uploadedImage,
    imagePreview,
    isGenerating,
    generationResults,
    handleFileUpload,
    handleGenerate,
    resetUpload,
  }
}
