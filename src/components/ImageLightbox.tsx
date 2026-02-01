import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface ImageLightboxProps {
  images: Array<{ url: string; altText?: string }>;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImageLightbox({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  // Reset index when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
    }
  }, [open, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
          break;
        case "ArrowRight":
          setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
          break;
        case "Escape":
          onOpenChange(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, images.length, onOpenChange]);

  if (!images.length) return null;

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-none overflow-hidden"
        hideCloseButton
      >
        <VisuallyHidden>
          <DialogTitle>Image viewer</DialogTitle>
        </VisuallyHidden>
        
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-50 text-white hover:bg-white/20 rounded-full"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Navigation buttons */}
        {hasMultiple && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 rounded-full h-12 w-12"
              onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Zoom toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 left-2 z-50 text-white hover:bg-white/20 rounded-full"
          onClick={() => setIsZoomed(!isZoomed)}
          aria-label={isZoomed ? "Zoom out" : "Zoom in"}
        >
          {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
        </Button>

        {/* Image container */}
        <div 
          className={cn(
            "flex items-center justify-center w-full h-full min-h-[50vh]",
            isZoomed ? "cursor-zoom-out overflow-auto" : "cursor-zoom-in"
          )}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={currentImage.url}
            alt={currentImage.altText || "Image"}
            className={cn(
              "transition-transform duration-200",
              isZoomed 
                ? "max-w-none w-auto h-auto" 
                : "max-w-[90vw] max-h-[85vh] object-contain"
            )}
          />
        </div>

        {/* Alt text and image counter */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8">
          {currentImage.altText && (
            <p className="text-white/90 text-sm text-center mb-2 max-w-2xl mx-auto">
              {currentImage.altText}
            </p>
          )}
          {hasMultiple && (
            <div className="flex justify-center gap-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    idx === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  aria-label={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
