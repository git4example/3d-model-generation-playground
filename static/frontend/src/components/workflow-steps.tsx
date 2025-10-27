"use client"

import { Wand2, ImageIcon, Box } from "lucide-react"

export function WorkflowSteps() {
  const steps = [
    {
      number: 1,
      title: "Generate Image",
      description: "Describe what you want. Our AI creates an image.",
      icon: Wand2,
      color: "text-chart-1",
    },
    {
      number: 2,
      title: "Review Image",
      description: "Check the result. Regenerate if needed.",
      icon: ImageIcon,
      color: "text-chart-2",
    },
    {
      number: 3,
      title: "Create 3D Model",
      description: "Turn your image into a 3D asset.",
      icon: Box,
      color: "text-chart-3",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {steps.map((step, index) => (
        <div key={step.number} className="relative">
          <div className="flex flex-col items-center text-center space-y-3">
            <div
              className={`w-16 h-16 rounded-2xl bg-accent/50 backdrop-blur flex items-center justify-center ${step.color}`}
            >
              <step.icon className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                {step.number}. {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          </div>
          {index < steps.length - 1 && (
            <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
          )}
        </div>
      ))}
    </div>
  )
}
