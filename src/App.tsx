import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionProvider } from "@/context/SessionContext";
import { KeyboardProvider } from "@/context/KeyboardContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/shared/AppLayout";
import { LoginPage } from "@/features/login/LoginPage";
import { WorkOrderListPage } from "@/features/work-orders/WorkOrderListPage";
import { OperationDetailsPage } from "@/features/operation/OperationDetailsPage";
import { QuestionnairePage } from "@/features/questionnaire/QuestionnairePage";
import { TimeTrackingPage } from "@/features/time-tracking/TimeTrackingPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CorrectionsPage } from "@/features/corrections/CorrectionsPage";

function App() {
  return (
    <SessionProvider>
      <TooltipProvider>
        <KeyboardProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AppLayout />}>
                <Route path="/orders" element={<WorkOrderListPage />} />
                <Route
                  path="/orders/:transac/operation/:copmachine"
                  element={<OperationDetailsPage />}
                />
                <Route
                  path="/orders/:transac/questionnaire/:type"
                  element={<QuestionnairePage />}
                />
                <Route path="/time-tracking" element={<TimeTrackingPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/corrections/:tjseq" element={<CorrectionsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </KeyboardProvider>
      </TooltipProvider>
    </SessionProvider>
  );
}

export default App;
