export function CreateProgress() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/30">
          1
        </div>
        <span className="text-sm font-medium text-primary">Create</span>
      </div>
      <div className="w-16 h-0.5 bg-border" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
          2
        </div>
        <span className="text-sm text-muted-foreground">Preview</span>
      </div>
      <div className="w-16 h-0.5 bg-border" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-bold">
          3
        </div>
        <span className="text-sm text-muted-foreground">3D Model</span>
      </div>
    </div>
  )
}
