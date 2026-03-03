import { render, screen } from "@testing-library/react";
import App from "./App";

describe("App", () => {
  it("renders the login page by default", () => {
    // App includes its own BrowserRouter, so render directly without test-utils wrapper
    render(<App />);
    expect(screen.getByText("Prod")).toBeInTheDocument();
  });
});
