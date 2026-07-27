/**
 * API Service Wrapper for backend interactions.
 * Handles fetching, request formatting, timeouts, and error handling.
 */
import { ChatResponse, LeadershipSummaryResponse, BoardDataResponse, ApiError, DashboardResponse } from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiServiceError extends Error {
  detail: string;
  errorType: string;
  status: number;

  constructor(message: string, detail: string, errorType: string, status: number) {
    super(message);
    this.name = 'ApiServiceError';
    this.detail = detail;
    this.errorType = errorType;
    this.status = status;
  }
}

/**
 * Helper to process response and handle errors in a unified format.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>;
  }

  let detail = 'An unexpected server error occurred.';
  let errorType = 'ServerException';

  try {
    const errorJson = await response.json() as ApiError;
    if (errorJson && errorJson.detail) {
      detail = errorJson.detail;
      errorType = errorJson.error_type || 'ApiException';
    }
  } catch {
    // If response body is not JSON or empty
    detail = response.statusText || detail;
  }

  throw new ApiServiceError(
    `API Request Failed: ${detail}`,
    detail,
    errorType,
    response.status
  );
}

export const api = {
  /**
   * Sends a user chat message to the backend.
   */
  async sendChatMessage(message: string, conversationId?: string): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    });
    return handleResponse<ChatResponse>(response);
  },

  /**
   * Fetches the generated weekly leadership narrative update.
   */
  async getLeadershipSummary(): Promise<LeadershipSummaryResponse> {
    const response = await fetch(`${API_BASE_URL}/leadership-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<LeadershipSummaryResponse>(response);
  },

  /**
   * Fetches raw and cleaned Monday.com board data and metadata.
   */
  async getBoardsData(refresh: boolean = false): Promise<BoardDataResponse> {
    const response = await fetch(`${API_BASE_URL}/boards?refresh=${refresh}`, {
      method: 'GET',
    });
    return handleResponse<BoardDataResponse>(response);
  },

  /**
   * Fetches unified dashboard KPI and visual analytics dataset.
   */
  async getDashboardData(refresh: boolean = false): Promise<DashboardResponse> {
    const response = await fetch(`${API_BASE_URL}/dashboard?refresh=${refresh}`, {
      method: 'GET',
    });
    return handleResponse<DashboardResponse>(response);
  },
};
