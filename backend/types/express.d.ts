import type { SessionUser } from "../utils/ownership";

declare global {
  namespace Express {
    interface Request {
      currentUser?: SessionUser;
      requestId?: string;
      log?: {
        debug: (obj: unknown, msg?: string) => void;
        info: (obj: unknown, msg?: string) => void;
        warn: (obj: unknown, msg?: string) => void;
        error: (obj: unknown, msg?: string) => void;
      };
    }
  }
}

export {};
