import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ModelViewer } from "@/components/model-viewer"
import { ArrowRight } from "lucide-react"
import type { GenerationResult } from "@/types/models"

interface Direct3DResultsProps {
  results: {
    triposr?: GenerationResult
    stable3dgen?: GenerationResult
    direct3ds2?: GenerationResult
  }
  onViewAllModels: () => void
  onGenerateAnother: () => void
}

export function ImageTo3DResults({ results, onViewAllModels, onGenerateAnother }: Direct3DResultsProps) {
  const allFailed = Object.values(results).every(r => r?.status === 'rejected')

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground mb-2">3D Models Generated</h3>
        <p className="text-sm text-muted-foreground">Compare all three models side by side</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TripoSR */}
        <Card className="p-4 border-primary/20">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-center text-primary">TripoSR</h4>
            {results.triposr?.status === 'fulfilled' ? (
              <>
                <div className="aspect-square rounded-lg overflow-hidden border border-primary/20 bg-gradient-to-br from-black/90 to-primary/10">
                  <ModelViewer
                    src={results.triposr.value?.output?.download_url || ""}
                    alt="TripoSR Model"
                    className="w-full h-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">Fast generation (~30s)</p>
              </>
            ) : (
              <div className="aspect-square rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-center">
                <p className="text-xs text-destructive text-center px-2">
                  {results.triposr?.status === 'rejected' ? (results.triposr.reason?.message || 'Generation failed') : 'Generation failed'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Stable3DGen */}
        <Card className="p-4 border-secondary/20">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-center text-secondary">Stable3DGen</h4>
            {results.stable3dgen?.status === 'fulfilled' ? (
              <>
                <div className="aspect-square rounded-lg overflow-hidden border border-secondary/20 bg-gradient-to-br from-black/90 to-secondary/10">
                  <ModelViewer
                    src={results.stable3dgen.value?.output?.download_url || ""}
                    alt="Stable3DGen Model"
                    className="w-full h-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">Advanced detail (~2m)</p>
              </>
            ) : (
              <div className="aspect-square rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-center">
                <p className="text-xs text-destructive text-center px-2">
                  {results.stable3dgen?.status === 'rejected' ? (results.stable3dgen.reason?.message || 'Generation failed') : 'Generation failed'}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Direct3D-S2 */}
        <Card className="p-4 border-chart-3/20">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-center text-chart-3">Direct3D-S2</h4>
            {results.direct3ds2?.status === 'fulfilled' ? (
              <>
                <div className="aspect-square rounded-lg overflow-hidden border border-chart-3/20 bg-gradient-to-br from-black/90 to-chart-3/10">
                  <ModelViewer
                    src={results.direct3ds2.value?.output?.download_url || ""}
                    alt="Direct3D-S2 Model"
                    className="w-full h-full"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">Production-ready (~1-2m)</p>
              </>
            ) : (
              <div className="aspect-square rounded-lg border border-destructive/20 bg-destructive/5 flex items-center justify-center">
                <p className="text-xs text-destructive text-center px-2">
                  {results.direct3ds2?.status === 'rejected' ? (results.direct3ds2.reason?.message || 'Generation failed') : 'Generation failed'}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="flex gap-4">
        <Button
          onClick={onViewAllModels}
          disabled={allFailed}
          className="flex-1 bg-gradient-to-r from-chart-3 to-chart-4 hover:opacity-90 text-white shadow-lg shadow-chart-3/30 h-12 text-base"
          size="lg"
        >
          View All Models
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
        <Button
          onClick={onGenerateAnother}
          variant="outline"
          className="border-chart-3/30 hover:bg-chart-3/10"
          size="lg"
        >
          Generate Another
        </Button>
      </div>
    </div>
  )
}
