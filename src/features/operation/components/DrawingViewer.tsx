import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DrawingViewerProps {
  documentUrl?: string;
}

export function DrawingViewer({ documentUrl }: DrawingViewerProps) {
  if (!documentUrl) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No drawing available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-base">Drawing</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <iframe
          src={documentUrl}
          title="Drawing Viewer"
          className="w-full h-[400px] rounded border"
          style={{ objectFit: "contain" }}
        />
      </CardContent>
    </Card>
  );
}
