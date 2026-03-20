import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface DrawingViewerProps {
  images?: string[];
}

function isPdf(url: string) {
  return /\.pdf$/i.test(url) || /\/doc\/\d+/.test(url);
}

export function DrawingViewer({ images }: DrawingViewerProps) {
  const [page, setPage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <Card className="py-0 gap-0">
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No drawing available
        </CardContent>
      </Card>
    );
  }

  const total = images.length;
  const currentUrl = images[page];

  return (
    <>
      <Card className="py-0 gap-0">
        <CardContent className="px-4 pt-3 pb-4 flex flex-col gap-3">
          {isPdf(currentUrl) ? (
            /* Wrap in relative container with transparent overlay — <object> swallows all mouse events */
            <div className="relative cursor-pointer" style={{ height: "600px" }} onClick={() => setFullscreen(true)}>
              <object
                data={`${currentUrl}#toolbar=0`}
                type="application/pdf"
                className="w-full h-full rounded border"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <p className="text-sm">PDF preview not available</p>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open PDF in new tab
                  </a>
                </div>
              </object>
              {/* Transparent click-catcher — right 15% left free so scroll gestures still work */}
              <div className="absolute inset-y-0 left-0 right-[15%]" />
            </div>
          ) : (
            <img
              src={currentUrl}
              alt="Drawing"
              className="w-full rounded border object-contain cursor-pointer max-h-[600px]"
              onClick={() => setFullscreen(true)}
            />
          )}
          {total > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {total}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
                disabled={page === total - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen modal — portaled to body to escape overflow-y-auto scroll container */}
      {fullscreen && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-white flex flex-col"
          onClick={() => setFullscreen(false)}
        >
          <div className="flex items-center justify-between px-4 py-2 shrink-0">
            {total > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10"
                  onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(0, p - 1)); }}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-sm">
                  {page + 1} / {total}
                </span>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-10 w-10"
                  onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(total - 1, p + 1)); }}
                  disabled={page === total - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}
            {!total || total <= 1 ? <div /> : null}
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10"
              onClick={() => setFullscreen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 p-4 pt-0" onClick={(e) => e.stopPropagation()}>
            {isPdf(currentUrl) ? (
              <object
                data={`${currentUrl}#toolbar=0`}
                type="application/pdf"
                className="w-full h-full rounded border"
              >
                <p className="text-sm text-muted-foreground text-center py-8">
                  PDF preview not available —{" "}
                  <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                    Open in new tab
                  </a>
                </p>
              </object>
            ) : (
              <img
                src={currentUrl}
                alt="Drawing"
                className="w-full h-full rounded border object-contain"
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
