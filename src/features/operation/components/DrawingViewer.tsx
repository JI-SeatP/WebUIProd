import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DrawingViewerProps {
  images?: string[];
}

export function DrawingViewer({ images }: DrawingViewerProps) {
  const [page, setPage] = useState(0);

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

  return (
    <Card className="py-0 gap-0">
      <CardContent className="px-4 pt-3 pb-4">
        {total > 1 && (
          <div className="flex items-center justify-end gap-2 mb-2">
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
        <img
          src={images[page]}
          alt={`Drawing page ${page + 1}`}
          className="w-full rounded border object-contain max-h-[600px]"
        />
      </CardContent>
    </Card>
  );
}
