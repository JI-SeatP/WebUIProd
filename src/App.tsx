import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SessionProvider } from "@/context/SessionContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/shared/AppLayout";
import { LoginPage } from "@/features/login/LoginPage";

function App() {
  return (
    <SessionProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AppLayout />}>
              <Route path="/orders" element={<PlaceholderPage title="Work Orders" />} />
              <Route
                path="/orders/:transac/operation/:copmachine"
                element={<PlaceholderPage title="Operation Details" />}
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
