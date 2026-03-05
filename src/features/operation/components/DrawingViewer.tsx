import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface DrawingViewerProps {
  images?: string[];
}

const PDF_PARAMS = "#page=1&pagemode=none&view=Fit&toolbar=0&navpanes=0&scrollbar=0";

function isPdf(url: string) {
  return /\.pdf$/i.test(url) || /\/doc\/\d+/.test(url);
}

function DrawingContent({ url, onClick, className }: { url: string; onClick?: () => void; className?: string }) {
  if (isPdf(url)) {
    return (
      <div className={`relative cursor-pointer ${className ?? ""}`} onClick={onClick}>
        <object
          data={`${url}${PDF_PARAMS}`}
          type="application/pdf"
          className="w-full h-full rounded border pointer-events-none"
        >
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-sm">PDF preview not available</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 underline pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              Open PDF in new tab
            </a>
          </div>
        </object>
        {/* Transparent overlay to capture clicks over the PDF object */}
        <div className="absolute inset-0" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt="Drawing"
      className={`w-full rounded border object-contain cursor-pointer ${className ?? ""}`}
      onClick={onClick}
    />
  );
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
          <DrawingContent
            url={currentUrl}
            onClick={() => setFullscreen(true)}
            className="h-[600px]"
          />
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

      {/* Fullscreen modal */}
      {fullscreen && (
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
            <DrawingContent
              url={currentUrl}
              className="h-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
