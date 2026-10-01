import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError";

export const DATABASE_DOWN =
  "The database isn't reachable right now. Nothing has been changed. If you run PawLedger yourself, check your internet connection and the Atlas Network Access list (your IP address may have changed), then run npm run doctor.";
const DB_DOWN_ERRORS = /^(MongoServerSelectionError|MongooseServerSelectionError|MongoNetworkError|MongoNetworkTimeoutError|MongoNotConnectedError|MongoTopologyClosedError)$/;

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const field = first.path.join(".");
    res.status(400).json({ message: field ? `${field}: ${first.message}` : first.message });
    return;
  }
  // The database can't be reached (dropped connection, Atlas no longer allowing this address, no internet).
  const name = err instanceof Error ? err.name : "";
  const text = err instanceof Error ? err.message : "";
  if (DB_DOWN_ERRORS.test(name) || /buffering timed out/i.test(text)) {
    res.status(503).json({ message: DATABASE_DOWN });
    return;
  }

  // Mistakes in the request itself (unreadable JSON, a body that is too large) are the caller's, not a server fault.
  const status = (err as { status?: unknown }).status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ message: status === 413 ? "That request is too large." : "That request couldn't be read. Check that it is valid JSON." });
    return;
  }
  // Log the error, never the request body (it may contain financial data).
  console.error("Unhandled error:", err instanceof Error ? err.message : err);
  res.status(500).json({ message: "Something went wrong on our side. Your data has not been changed." });
}
