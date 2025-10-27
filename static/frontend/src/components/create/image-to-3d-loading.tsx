import { Card } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { LoadingAnimation } from "@/components/loading-animation"
import { ModelViewer } from "@/components/model-viewer"
import type { GenerationResult } from "@/types/models"

interface ImageTo3DLoadingProps {
  message?: string
  results?: {
    triposr?: GenerationResult
    stable3dgen?: GenerationResult
    direct3ds2?: GenerationResult
  }
}

export function ImageTo3DLoading({ 
  message = "Generating 3D models with all services...",
  results = {}
}: ImageTo3DLoadingProps) {
  const services = [
    { id: 'triposr', name: 'TripoSR', key: 'triposr' as const, color: 'primary' },
    { id: 'stable3dgen', name: 'Stable3DGen', key: 'stable3dgen' as const, color: 'secondary' },
    { id: 'direct3ds2', name: 'Direct3D-S2', key: 'direct3ds2' as const, color: 'chart-3' }
  ]

  const getServiceStatus = (key: 'triposr' | 'stable3dgen' | 'direct3ds2') => {
    const result = results[key]
    if (!result) return 'generating'
    return result.status === 'fulfilled' ? 'completed' : 'failed'
  }

  const getServiceData = (key: 'triposr' | 'stable3dgen' | 'direct3ds2') => {
    const result = results[key]
    if (!result || result.status !== 'fulfilled') return null
    return result.value
  }

  const allCompleted = services.every(s => getServiceStatus(s.key) !== 'generating')

  return (
    <div className="space-y-4">
      <div className="text-center">
        <LoadingAnimation message={allCompleted ? "All models generated!" : message} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map((service) => {
          const status = getServiceStatus(service.key)
          const data = getServiceData(service.key)
          
          return (
            <Card key={service.id} className={`p-4 ${
              status === 'completed' ? `border-${service.color}/50 bg-${service.color}/5` :
              status === 'failed' ? 'border-destructive/50 bg-destructive/5' :
              'border-muted'
            }`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{service.name}</h4>
                  {status === 'generating' && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {status === 'completed' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {status === 'failed' && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>

                {status === 'generating' && (
                  <div className="aspect-square rounded-lg border border-muted bg-muted/20 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">Generating...</p>
                    </div>
                  </div>
                )}

                {status === 'completed' && (data?.output?.model_url || data?.output?.glb_url || data?.output?.download_url) && (
                  <div className="aspect-square rounded-lg overflow-hidden border border-green-500/20 bg-gradient-to-br from-black/90 to-green-500/10">
                    <ModelViewer
                      src={(data.output.model_url || data.output.glb_url || data.output.download_url) as string}
                      alt={`${service.name} Model`}
                      className="w-full h-full"
                    />
                  </div>
                )}

                {status === 'failed' && (
                  <div className="aspect-square rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-center">
                    <p className="text-xs text-destructive text-center px-2">
                      {(() => {
                        const result = results[service.key]
                        if (result?.status === 'rejected') {
                          const reason = result.reason
                          return reason?.message || reason?.toString() || 'Generation failed'
                        }
                        return 'Generation failed'
                      })()}
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  {status === 'generating' && 'Processing...'}
                  {status === 'completed' && 'Ready to view'}
                  {status === 'failed' && 'Failed'}
                </p>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
