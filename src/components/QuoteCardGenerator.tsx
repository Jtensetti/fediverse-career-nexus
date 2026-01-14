import { useState, useRef, useCallback } from "react";
import { Download, Image as ImageIcon, Loader2, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuoteCardGeneratorProps {
  content: string;
  author: {
    name: string;
    handle?: string;
    avatar_url?: string;
  };
  postUrl?: string;
  trigger?: React.ReactNode;
}

export default function QuoteCardGenerator({
  content,
  author,
  postUrl,
  trigger
}: QuoteCardGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isVertical, setIsVertical] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const truncatedContent = content.length > 280 
    ? content.substring(0, 277) + '...' 
    : content;

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      // Dynamic import of html-to-image to reduce bundle size
      const { toPng } = await import('html-to-image');
      
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `nolto-quote-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Image downloaded!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Try again.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const cardClasses = cn(
    "rounded-2xl p-6 overflow-hidden",
    isVertical ? "w-[400px] min-h-[500px]" : "w-[600px] min-h-[300px]",
    isDarkMode 
      ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
      : "bg-gradient-to-br from-white via-slate-50 to-white text-slate-900"
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Share as Image
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Download as Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Label htmlFor="dark-mode" className="text-sm flex items-center gap-1.5">
                <Sun className="h-4 w-4" />
                /
                <Moon className="h-4 w-4" />
              </Label>
              <Switch
                id="dark-mode"
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="vertical" className="text-sm">Vertical (Stories)</Label>
              <Switch
                id="vertical"
                checked={isVertical}
                onCheckedChange={setIsVertical}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="flex justify-center overflow-auto py-4 bg-muted/30 rounded-lg">
            <div 
              ref={cardRef}
              className={cardClasses}
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
              {/* Content */}
              <div className={cn(
                "flex flex-col justify-between h-full",
                isVertical && "min-h-[420px]"
              )}>
                <div className="flex-1 flex items-center">
                  <blockquote className={cn(
                    "text-lg font-medium leading-relaxed",
                    isVertical ? "text-xl" : "text-lg",
                    isDarkMode ? "text-white/90" : "text-slate-700"
                  )}>
                    "{truncatedContent}"
                  </blockquote>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-current/10">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-current/10">
                      <AvatarImage src={author.avatar_url} />
                      <AvatarFallback className={cn(
                        isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"
                      )}>
                        {author.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{author.name}</p>
                      {author.handle && (
                        <p className={cn(
                          "text-xs",
                          isDarkMode ? "text-white/60" : "text-slate-500"
                        )}>
                          @{author.handle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nolto branding */}
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs font-medium",
                    isDarkMode ? "text-white/50" : "text-slate-400"
                  )}>
                    <svg 
                      viewBox="0 0 24 24" 
                      className="h-4 w-4" 
                      fill="currentColor"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                    nolto.app
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download button */}
          <Button 
            onClick={generateImage} 
            disabled={isGenerating}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Image
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
