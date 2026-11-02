import { Dumbbell } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="flex flex-col items-center text-center">

        {/* Animated exercise icon */}
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          {/* Outer pulse */}
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" />

          {/* Inner circle */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-card shadow-lg shadow-primary/10">
            <Dumbbell
              size={38}
              className="animate-bounce text-primary"
              strokeWidth={1.8}
            />
          </div>
        </div>

        {/* Loading text */}
        <h2 className="text-xl font-bold tracking-wide">
          Getting things ready
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Every step counts. Keep moving.
        </p>

        {/* Animated loading indicator */}
        <div className="mt-6 flex items-center gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>

      </div>
    </div>
  );
}