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
      <main className="flex-1 overflow-hidden px-3 pt-[7px] pb-3 bg-[#C5E0D4]">
        <Outlet />
      </main>
    </div>
  );
}
