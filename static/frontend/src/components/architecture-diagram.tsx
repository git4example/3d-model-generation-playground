import { Card } from "@/components/ui/card"

export function ArchitectureDiagram() {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-6 md:p-8 shadow-xl">
      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-4">Architecture</h3>
      <div className="space-y-4">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202025-09-25%20at%2011.54.32%E2%80%AFAM-ZuyCd5NMCVsC2Q8PCrleABR6LIZPS0.png"
          alt="AWS Architecture Diagram"
          className="w-full rounded-lg border border-border/50"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Frontend hosted on <strong className="text-foreground">AWS Amplify</strong> with CloudFront and WAF
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </div>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">API Gateway</strong> manages endpoints and triggers Lambda functions
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Text-to-Image Lambda performs validation and prompt engineering
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                4
              </div>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">stable-diffusion-3.5-large</strong> generates high-quality images
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                5
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Image-to-3D Lambda forwards to <strong className="text-foreground">SQS</strong> queue
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                6
              </div>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Amazon EKS</strong> hosts ML models on GPU instances
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                7
              </div>
              <p className="text-muted-foreground leading-relaxed">
                3D files written to <strong className="text-foreground">S3</strong> with metadata in DynamoDB
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                8
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Retrieval Lambda queries <strong className="text-foreground">DynamoDB</strong> for job details
              </p>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                9
              </div>
              <p className="text-muted-foreground leading-relaxed">
                3D object returned as GLB/USDZ for AR visualization
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
