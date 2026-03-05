import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { Employee } from "@/types/employee";
import type { Department } from "@/types/department";
import type { Machine } from "@/types/machine";

export interface ActiveOperation {
  TRANSAC: number;
  COPMACHINE: number | null;
  NOPSEQ: number;
  TJSEQ: number | null;
}

export interface SessionState {
  isAuthenticated: boolean;
  employee: Employee | null;
  department: Department | null;
  machines: Machine[];
  language: "fr" | "en";
  activeOperation: ActiveOperation | null;
}

type SessionAction =
  | { type: "LOGIN"; payload: { employee: Employee } }
  | { type: "LOGOUT" }
  | { type: "SET_DEPARTMENT"; payload: { department: Department | undefined } }
  | { type: "SET_MACHINES"; payload: { machines: Machine[] } }
  | { type: "SET_LANGUAGE"; payload: { language: "fr" | "en" } }
  | { type: "SET_ACTIVE_OPERATION"; payload: { operation: ActiveOperation | null } };

const initialState: SessionState = {
  isAuthenticated: false,
  employee: null,
  department: null,
  machines: [],
  language: "fr",
  activeOperation: null,
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        isAuthenticated: true,
        employee: action.payload.employee,
      };
    case "LOGOUT":
      return { ...initialState };
    case "SET_DEPARTMENT":
      return { ...state, department: action.payload.department ?? null };
    case "SET_MACHINES":
      return { ...state, machines: action.payload.machines };
    case "SET_LANGUAGE":
      return { ...state, language: action.payload.language };
    case "SET_ACTIVE_OPERATION":
      return { ...state, activeOperation: action.payload.operation };
    default:
      return state;
  }
}

interface SessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);
  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
