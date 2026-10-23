import type { ApiError } from '../types/files';

export class ClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ClientError';
    this.code = code;
    this.status = status;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'same-origin',
  };

  if (!(options.body instanceof FormData)) {
    fetchOptions.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  } else if (options.headers) {
    fetchOptions.headers = options.headers;
  }

  const response = await fetch(endpoint, fetchOptions);

  if (!response.ok) {
    let errorCode = 'UNKNOWN_ERROR';
    let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;

    try {
      const errorJson = (await response.json()) as ApiError;
      if (errorJson && errorJson.message) {
        errorMessage = errorJson.message;
        errorCode = errorJson.code || errorCode;
      }
    } catch {
      // Body wasn't JSON, retain default status text message
    }

    throw new ClientError(errorMessage, errorCode, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
