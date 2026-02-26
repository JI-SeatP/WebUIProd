import { Outlet, Navigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { Header } from "./Header";
import { InfoBar } from "./InfoBar";
import { Footer } from "./Footer";

export function AppLayout() {
  const { state } = useSession();

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <InfoBar />
      <main className="flex-1 overflow-auto p-3">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
