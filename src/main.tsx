import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto-condensed/400.css";
import "@fontsource/roboto-condensed/500.css";
import "@fontsource/roboto-condensed/600.css";
import "@fontsource/roboto-condensed/700.css";
import "./index.css";
import "./i18n";
import App from "./App";

async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCKS === "true") {
    const { worker } = await import("./mocks/browser");
    return worker.start({
      onUnhandledRequest: "bypass",
    });
  }
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
