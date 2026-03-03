// In dev: BASE_URL = "/" → use "/api" (Vite proxy handles it)
// In prod: BASE_URL = "/STPWEB/WebUIProd_Test/web/" → "/STPWEB/WebUIProd_Test/queries"
const API_BASE = import.meta.env.DEV
  ? "/api"
  : import.meta.env.BASE_URL.replace(/web\/$/, "queries");

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export async function apiGet<T>(endpoint: string): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}/${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export async function apiPost<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}
