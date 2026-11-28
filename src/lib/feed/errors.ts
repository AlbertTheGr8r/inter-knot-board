import type { FeedErrorCode } from "../../data/types";

export class FeedError extends Error {
  readonly code: FeedErrorCode;
  readonly status?: number;

  constructor(code: FeedErrorCode, message: string, status?: number) {
    super(message);
    this.name = "FeedError";
    this.code = code;
    this.status = status;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof FeedError) return error.message;
  if (error instanceof Error) return error.message;
  return "The feed could not be loaded.";
}

export function errorCode(error: unknown): FeedErrorCode {
  return error instanceof FeedError ? error.code : "network";
}

export function statusOf(error: unknown): number | undefined {
  return error instanceof FeedError ? error.status : undefined;
}
