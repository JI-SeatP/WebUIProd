/**
 * Shared TypeScript types for the WebUIProd application.
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}
