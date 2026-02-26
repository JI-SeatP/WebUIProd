import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionProvider } from "@/context/SessionContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/shared/AppLayout";
import { LoginPage } from "@/features/login/LoginPage";
import { WorkOrderListPage } from "@/features/work-orders/WorkOrderListPage";
import { OperationDetailsPage } from "@/features/operation/OperationDetailsPage";

function App() {
  return (
    <SessionProvider>
      <TooltipProvider>
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
                element={<PlaceholderPage title="Questionnaire" />}
              />
              <Route path="/time-tracking" element={<PlaceholderPage title="Time Tracking" />} />
              <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
              <Route path="/corrections/:tjseq" element={<PlaceholderPage title="Corrections" />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </SessionProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-2xl text-muted-foreground">{title} — Coming Soon</p>
    </div>
  );
}

export default App;
