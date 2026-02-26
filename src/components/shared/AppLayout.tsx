import { Outlet, Navigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { Header } from "./Header";

export function AppLayout() {
  const { state } = useSession();

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden p-3">
        <Outlet />
      </main>
    </div>
  );
}
