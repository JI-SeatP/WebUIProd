import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionTimeTab } from "./components/ProductionTimeTab";
import { AddHoursTab } from "./components/AddHoursTab";
import { SearchTab } from "./components/SearchTab";

export function TimeTrackingPage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full p-3">
      <h1 className="text-xl font-bold mb-3">{t("timeTracking.title")}</h1>

      <Tabs defaultValue="production" className="flex-1 flex flex-col">
        <TabsList className="shrink-0">
          <TabsTrigger value="production" className="touch-target text-base px-6">
            {t("timeTracking.productionTime")}
          </TabsTrigger>
          <TabsTrigger value="addHours" className="touch-target text-base px-6">
            {t("timeTracking.addHours")}
          </TabsTrigger>
          <TabsTrigger value="search" className="touch-target text-base px-6">
            {t("timeTracking.search")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="flex-1 overflow-auto mt-3">
          <ProductionTimeTab />
        </TabsContent>

        <TabsContent value="addHours" className="flex-1 overflow-auto mt-3">
          <AddHoursTab />
        </TabsContent>

        <TabsContent value="search" className="flex-1 overflow-auto mt-3">
          <SearchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
