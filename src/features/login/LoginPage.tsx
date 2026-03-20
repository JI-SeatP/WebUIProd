import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { apiPost } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumPad } from "@/components/shared/NumPad";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { W_LOGIN } from "@/constants/widths";
import { cn } from "@/lib/utils";
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
      <Card
        className={cn(
          "w-full gap-[26px] py-[27px]",
          W_LOGIN.card,
        )}
      >
        <CardHeader className="text-center pb-[9px] px-[26px]">
          <img src="/logo-seatply.png" alt="SeatPly" className={cn("mx-auto mb-[4px]", W_LOGIN.logo)} />
          <CardTitle className="text-[1.375rem]">{t("actions.login")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-[17.6px] px-[26px]">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div
                className={cn(
                  "bg-muted rounded-md px-[18px] py-[13px] w-full text-center font-sans tabular-nums flex items-center justify-center text-[3.795rem]",
                  W_LOGIN.codeDisplayMinH,
                )}
              >
                {code || "0"}
              </div>
              <NumPad
                value={code}
                onChange={setCode}
                showDisplay={false}
                showActions={false}
                size="large"
                className="shadow-none border-0 w-full"
              />
              {error && (
                <p className="text-[0.9625rem] text-destructive font-medium">{error}</p>
              )}
              <Button
                size="lg"
                className={cn(
                  "w-full text-[1.2375rem] bg-action text-action-foreground hover:bg-action/90 uppercase font-bold",
                  W_LOGIN.loginButtonMinH,
                )}
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
