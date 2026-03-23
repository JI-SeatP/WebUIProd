import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionTimeTab } from "./components/ProductionTimeTab";
import { AddHoursTab } from "./components/AddHoursTab";
import { AddHoursOldTab } from "./components/AddHoursOldTab";

const tabTriggerClass =
  "touch-target text-base px-6 shadow-none after:hidden rounded-md border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 data-[state=active]:border-2 data-[state=active]:border-black data-[state=active]:bg-[#aeffae] data-[state=active]:text-black data-[state=active]:hover:bg-[#aeffae]";

function TabsNav() {
  const { t } = useTranslation();
  return (
    <TabsList className="shrink-0 !h-auto min-h-0 gap-1 bg-transparent p-0 items-center">
      <TabsTrigger value="production" className={tabTriggerClass}>
        {t("timeTracking.productionTime")}
      </TabsTrigger>
      <TabsTrigger value="addHours" className={tabTriggerClass}>
        {t("timeTracking.addHours")}
      </TabsTrigger>
      <TabsTrigger value="addHoursOld" className={tabTriggerClass}>
        {t("timeTracking.addHours")} OLD
      </TabsTrigger>
    </TabsList>
  );
}

export function TimeTrackingPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 p-3">
      <Tabs defaultValue="production" className="flex-1 min-h-0 flex flex-col">
        <TabsContent value="production" className="flex-1 min-h-0 mt-0 flex flex-col">
          <ProductionTimeTab tabsList={<TabsNav />} />
        </TabsContent>

        <TabsContent value="addHours" className="flex-1 min-h-0 mt-0 flex flex-col">
          <AddHoursTab tabsList={<TabsNav />} />
        </TabsContent>

        <TabsContent value="addHoursOld" className="flex-1 overflow-auto mt-0">
          <AddHoursOldTab tabsList={<TabsNav />} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
