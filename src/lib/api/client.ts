const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

export class ApiRequestError extends Error {
  status?: number;
  retryable: boolean;

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

function sanitizeApiMessage(status: number, rawMessage?: string): string {
  const normalizedMessage = rawMessage?.trim() ?? "";
  const lowerMessage = normalizedMessage.toLowerCase();

  if (status >= 500) {
    return "We hit a server problem. Please try again in a moment.";
  }

  if (lowerMessage.includes("validation failed") || lowerMessage.includes("cast to") || lowerMessage.includes("stack")) {
    return "We couldn't complete that request. Please review your input and try again.";
  }

  if (!normalizedMessage) {
    if (status === 404) return "The requested information could not be found.";
    if (status === 429) return "Too many requests were made. Please wait a moment and try again.";
    return `Request failed with status ${status}.`;
  }

  return normalizedMessage;
}

const API_CREDENTIALS: RequestCredentials = (import.meta.env.VITE_API_CREDENTIALS as RequestCredentials) ?? "include";

const createRequestInit = (options: RequestOptions): RequestInit => {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: HeadersInit = isFormData
    ? {}
    : {
        "Content-Type": "application/json",
      };

  return {
    method: options.method ?? "GET",
    headers,
    credentials: API_CREDENTIALS,
    body:
      options.body === undefined
        ? undefined
        : isFormData
          ? (options.body as FormData)
          : JSON.stringify(options.body),
  };
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, createRequestInit(options));
  } catch {
    throw new ApiRequestError("We couldn't reach the server. Check your connection and try again.", {
      retryable: true,
    });
  }

  if (!response.ok) {
    let rawMessage = "";
    let rawCode = "";

    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload.code) {
        rawCode = payload.code;
      }
      if (payload.message) {
        rawMessage = payload.message;
      }
    } catch {
      // Ignore payload parse failures and keep default message.
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const isAuthFlowRequest =
      normalizedPath === "/auth/login" ||
      normalizedPath === "/auth/forgot-password/request-code" ||
      normalizedPath === "/auth/forgot-password/verify-code" ||
      normalizedPath === "/auth/forgot-password/reset" ||
      normalizedPath === "/auth/first-login/request-code" ||
      normalizedPath === "/auth/first-login/verify-code" ||
      normalizedPath === "/auth/first-login/complete";

    // Backend is source-of-truth for session validity.
    if (response.status === 401) {
      const isOnPublicRoute =
        typeof window !== "undefined" &&
        (window.location.pathname === "/" ||
          window.location.pathname === "/landing" ||
          window.location.pathname === "/login" ||
          window.location.pathname === "/forgot-password" ||
          window.location.pathname === "/first-login-password-change");

      if (!isAuthFlowRequest && !isOnPublicRoute) {
        try {
          window.sessionStorage.clear();
        } catch {
          // ignore
        }
        window.location.href = "/";
      }
    }

    if (response.status === 403 && rawCode === "ACCOUNT_INACTIVE") {
      try {
        window.sessionStorage.clear();
        window.sessionStorage.setItem("authError", rawMessage || "Your account is inactive. Contact your administrator.");
      } catch {
        // ignore
      }
      window.location.href = "/";
    }

    throw new ApiRequestError(sanitizeApiMessage(response.status, rawMessage), {
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
