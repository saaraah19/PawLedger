import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  // Only used for CORS when the client is hosted elsewhere. Not needed in single-service mode (SERVE_CLIENT=true).
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  ALLOW_REGISTRATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  // One-service mode: the API also serves the built client, so there is a single origin and no CORS or cookie tuning.
  SERVE_CLIENT: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  CLIENT_DIST: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Names of the bad variables only — never print their values.
  const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n- ${problems.join("\n- ")}`);
}

export const env = parsed.data;
