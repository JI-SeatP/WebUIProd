import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionTimeTab } from "./components/ProductionTimeTab";
import { AddHoursTab } from "./components/AddHoursTab";

function TabsNav() {
  const { t } = useTranslation();
  return (
    <TabsList className="shrink-0 bg-transparent">
      <TabsTrigger value="production" className="touch-target text-base px-6 bg-transparent data-[state=active]:bg-[#aeffae] data-[state=active]:text-black data-[state=active]:border-2 data-[state=active]:border-black">
        {t("timeTracking.productionTime")}
      </TabsTrigger>
      <TabsTrigger value="addHours" className="touch-target text-base px-6 bg-transparent data-[state=active]:bg-[#aeffae] data-[state=active]:text-black data-[state=active]:border-2 data-[state=active]:border-black">
        {t("timeTracking.addHours")}
      </TabsTrigger>
    </TabsList>
  );
}

export function TimeTrackingPage() {
  return (
    <div className="flex flex-col h-full p-3">
      <Tabs defaultValue="production" className="flex-1 flex flex-col">
        <TabsContent value="production" className="flex-1 overflow-auto mt-0">
          <ProductionTimeTab tabsList={<TabsNav />} />
        </TabsContent>

        <TabsContent value="addHours" className="flex-1 overflow-auto mt-0">
          <AddHoursTab tabsList={<TabsNav />} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
