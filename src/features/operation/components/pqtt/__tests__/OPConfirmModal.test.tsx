import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OPConfirmModal, resetEmployeeCache } from "../OPConfirmModal";
import { SessionProvider } from "@/context/SessionContext";

vi.mock("@/api/pqtt", async () => {
  const actual = await vi.importActual<typeof import("@/api/pqtt")>("@/api/pqtt");
  return {
    ...actual,
    getEmployees: vi.fn(async () => ({
      success: true,
      data: [
        { EMP_NUM: "12345", EMP_NOM: "Alice Smith" },
        { EMP_NUM: "23456", EMP_NOM: "Bob Tremblay" },
        { EMP_NUM: "34567", EMP_NOM: "Charlie Roy" },
      ],
    })),
  };
});

describe("OPConfirmModal", () => {
  beforeEach(() => {
    resetEmployeeCache();
  });

  it("filters by EMP_NUM prefix", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <SessionProvider>
        <OPConfirmModal open onConfirm={onConfirm} onCancel={onCancel} />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText("Alice Smith")).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/ID/i);
    fireEvent.change(input, { target: { value: "23" } });

    await waitFor(() => {
      expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
      expect(screen.getByText("Bob Tremblay")).toBeInTheDocument();
      expect(screen.queryByText("Charlie Roy")).not.toBeInTheDocument();
    });
  });

  it("filters by EMP_NOM substring (case insensitive)", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <SessionProvider>
        <OPConfirmModal open onConfirm={onConfirm} onCancel={onCancel} />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText("Alice Smith")).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/ID/i);
    fireEvent.change(input, { target: { value: "roy" } });

    await waitFor(() => {
      expect(screen.queryByText("Alice Smith")).not.toBeInTheDocument();
      expect(screen.getByText("Charlie Roy")).toBeInTheDocument();
    });
  });

  it("auto-confirms when typed text exactly matches EMP_NUM", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <SessionProvider>
        <OPConfirmModal open onConfirm={onConfirm} onCancel={onCancel} />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText("Alice Smith")).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/ID/i);
    fireEvent.change(input, { target: { value: "12345" } });

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("12345", "Alice Smith"));
  });

  it("calls onConfirm when a row is tapped", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <SessionProvider>
        <OPConfirmModal open onConfirm={onConfirm} onCancel={onCancel} />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText("Bob Tremblay")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Bob Tremblay"));
    expect(onConfirm).toHaveBeenCalledWith("23456", "Bob Tremblay");
  });
});
