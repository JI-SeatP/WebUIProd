import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { apiPost } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumPad } from "@/components/shared/NumPad";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { Employee } from "@/types/employee";

export function LoginPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { dispatch } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!code) return;
    setError(null);
    setLoading(true);

    try {
      const res = await apiPost<Employee>("validateEmployee.cfm", {
        employeeCode: Number(code),
      });

      if (res.success && res.data) {
        dispatch({ type: "LOGIN", payload: { employee: res.data } });
        i18n.changeLanguage("fr");
        navigate("/orders");
      } else {
        setError(res.error ?? t("dialogs.error"));
      }
    } catch {
      setError(t("dialogs.error"));
    } finally {
      setLoading(false);
    }
  }, [code, dispatch, navigate, t, i18n]);

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ backgroundColor: "#C5E0D4" }}>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <img src="/logo-seatply.png" alt="SeatPly" className="h-16 mx-auto mb-1" />
          <CardTitle className="text-xl">{t("actions.login")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="bg-muted rounded-md px-4 py-3 w-full text-center text-5xl font-mono tabular-nums min-h-[80px] flex items-center justify-center">
                {code || "0"}
              </div>
              <NumPad
                value={code}
                onChange={setCode}
                showDisplay={false}
                showActions={false}
                className="shadow-none border-0 w-full"
              />
              {error && (
                <p className="text-sm text-destructive font-medium">{error}</p>
              )}
              <Button
                size="lg"
                className="w-full min-h-[48px] text-lg bg-action text-action-foreground hover:bg-action/90 uppercase font-bold"
                onClick={handleLogin}
                disabled={!code}
              >
                {t("actions.login")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
