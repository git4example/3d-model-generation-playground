"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"

export function ContentGuidelines() {
  const [isExpanded, setIsExpanded] = useState(false)

  const allowed = ["Game props", "Weapons & armor", "Collectibles", "Tools & items", "Fantasy objects", "Sci-fi assets"]

  const notAllowed = ["Violence", "Adult content", "Hate speech", "Weapons", "Harassment", "Misinformation"]

  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-chart-2" />
          <span className="font-semibold text-sm text-foreground">Content Guidelines</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-3 w-3 text-chart-2" />
              <h4 className="font-medium text-xs text-foreground">What's Allowed</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allowed.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="bg-chart-2/10 text-chart-2 border-chart-2/20 hover:bg-chart-2/20 text-xs"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-3 w-3 text-destructive" />
              <h4 className="font-medium text-xs text-foreground">Not Allowed</h4>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {notAllowed.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 text-xs"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Content is automatically checked against{" "}
              <a
                href="https://stability.ai/use-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Stability AI
                <ExternalLink className="h-2.5 w-2.5" />
              </a>{" "}
              and{" "}
              <a
                href="https://docs.aws.amazon.com/nova/latest/userguide/prompting-image-generation.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                AWS Nova Canvas
                <ExternalLink className="h-2.5 w-2.5" />
              </a>{" "}
              guidelines.
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}
