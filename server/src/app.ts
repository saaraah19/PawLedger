import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error";
import { analyticsRoutes } from "./routes/analytics";
import { authRoutes } from "./routes/auth";
import { categoryRoutes } from "./routes/categories";
import { demoRoutes } from "./routes/demo";
import { settingsRoutes } from "./routes/settings";
import { transactionRoutes } from "./routes/transactions";

export const app = express();

if (env.NODE_ENV === "production") app.set("trust proxy", 1); // Render sits behind a proxy

app.use(
  helmet({
    // "upgrade-insecure-requests" would break plain-http localhost in some browsers, so it is production-only.
    contentSecurityPolicy: { useDefaults: true, directives: { "upgrade-insecure-requests": env.NODE_ENV === "production" ? [] : null } },
  }),
);
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/transactions", transactionRoutes); // requireAuth is applied inside the router

// Anything under /api that no router handled is a JSON 404, never the web app.
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "That endpoint doesn't exist." });
});

if (env.SERVE_CLIENT) {
  const dist = env.CLIENT_DIST ?? path.resolve(__dirname, "../../client/dist");
  const index = path.join(dist, "index.html");
  if (fs.existsSync(index)) {
    app.use(
      express.static(dist, {
        index: false,
        setHeaders(res, file) {
          // Built assets are fingerprinted, so they can be cached for good; everything else must revalidate.
          const cacheable = file.includes(`${path.sep}assets${path.sep}`);
          res.setHeader("Cache-Control", cacheable ? "public, max-age=31536000, immutable" : "no-cache");
        },
      }),
    );
    // Single-page app: any other GET is a client-side route.
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next(); // HEAD too: uptime checks often use it
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(index);
    });
  } else {
    console.warn(`SERVE_CLIENT is on but ${index} was not found. Run "npm run build" first.`);
  }
}

app.use((_req, res) => {
  res.status(404).json({ message: "That endpoint doesn't exist." });
});
app.use(errorHandler);
