import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { apiGet } from "@/api/client";
import type { OperationStep, StepDetails } from "@/types/workOrder";

interface StepDetailsViewerProps {
  step: OperationStep;
  stepNumber: number;
  language: "fr" | "en";
  onClose: () => void;
}

type TabId = "instructions" | "pdf" | "video" | "images";

export function StepDetailsViewer({ step, stepNumber, language, onClose }: StepDetailsViewerProps) {
  const { t } = useTranslation();
  const [images, setImages] = useState<StepDetails["images"]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("instructions");

  // Determine available media from step data
  const rtfHtml = language === "fr" ? step.METRTF_P : step.METRTF_S;
  const pdfPath = language === "fr" ? step.METFICHIER_PDF_P : step.METFICHIER_PDF_S;
  const videoPath = language === "fr" ? step.METVIDEO_P : step.METVIDEO_S;

  // Build available tabs in priority order
  const tabs: { id: TabId; label: string }[] = [];
  if (rtfHtml) tabs.push({ id: "instructions", label: "INSTRUCTIONS" });
  if (pdfPath) tabs.push({ id: "pdf", label: "PDF" });
  if (videoPath) tabs.push({ id: "video", label: language === "fr" ? "VIDÉO" : "VIDEO" });
  if (step.IMAGE_COUNT > 0) tabs.push({ id: "images", label: "IMAGES" });

  // Set first available tab when step changes
  useEffect(() => {
    if (tabs.length > 0) setActiveTab(tabs[0].id);
  }, [step.METSEQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch images when images tab is selected
  useEffect(() => {
    if (activeTab !== "images" || step.IMAGE_COUNT === 0) return;
    setImagesLoading(true);
    apiGet<StepDetails>(`doc-methode-images/${step.METSEQ}`)
      .then((res) => {
        if (res.success) setImages(res.data.images);
      })
      .finally(() => setImagesLoading(false));
  }, [activeTab, step.METSEQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = language === "fr" ? step.METDESC_P : step.METDESC_S;

  return (
    <Card className="py-0 gap-0 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="text-sm font-medium truncate mr-2">
          <span className="text-blue-600 font-bold mr-2">{stepNumber}</span>
          {title}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="px-4 pt-0 pb-4 flex flex-col flex-1 min-h-0">
        {tabs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            {t("common.noResults")}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Tab bar */}
            {tabs.length > 1 && (
              <div className="flex gap-1 border-b mb-3 shrink-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="px-4 py-2 text-sm font-bold border-b-2 transition-colors"
                    style={{
                      borderColor: activeTab === tab.id ? "#000" : "transparent",
                      color: activeTab === tab.id ? "#000" : "#6b7280",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-auto">
              {/* INSTRUCTIONS — render RTF HTML */}
              {activeTab === "instructions" && rtfHtml && (
                <div
                  className="prose prose-sm max-w-none p-2 text-sm"
                  dangerouslySetInnerHTML={{ __html: rtfHtml }}
                />
              )}

              {/* PDF — served through Express file proxy */}
              {activeTab === "pdf" && pdfPath && (
                <object
                  data={`/api/doc-methode/${step.METSEQ}/${language === "fr" ? "pdf_p" : "pdf_s"}#toolbar=0`}
                  type="application/pdf"
                  className="w-full rounded"
                  style={{ height: "600px" }}
                >
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-8">
                    <p className="text-sm">{t("common.noResults")}</p>
                    <a
                      href={`/api/doc-methode/${step.METSEQ}/${language === "fr" ? "pdf_p" : "pdf_s"}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 underline"
                    >
                      PDF ↗
                    </a>
                  </div>
                </object>
              )}

              {/* VIDEO — served through Express file proxy */}
              {activeTab === "video" && videoPath && (
                <div className="flex justify-center items-start pt-4">
                  <video
                    src={`/api/doc-methode/${step.METSEQ}/${language === "fr" ? "video_p" : "video_s"}`}
                    controls
                    className="max-w-full rounded"
                    style={{ maxHeight: "500px" }}
                  />
                </div>
              )}

              {/* IMAGES */}
              {activeTab === "images" && (
                <div className="p-2">
                  {imagesLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      {t("dialogs.loading")}
                    </div>
                  ) : images.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      {t("common.noResults")}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {images.map((img, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                          <img
                            src={img.url}
                            alt={language === "fr" ? img.descP : img.descS}
                            className="max-w-full rounded border"
                            style={{ maxWidth: "400px" }}
                          />
                          <p className="text-sm text-center text-muted-foreground">
                            {language === "fr" ? img.descP : img.descS}
                          </p>
                          <hr className="w-full border-gray-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
