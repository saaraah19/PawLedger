import mongoose from "mongoose";
import { app } from "./app";
import { env } from "./config/env";

async function main() {
  mongoose.connection.on("disconnected", () =>
    console.warn("Lost the connection to MongoDB. Requests will fail until it returns. Check your internet connection and, on Atlas, Network Access (your IP address may have changed). Run `npm run doctor` for details."),
  );
  mongoose.connection.on("reconnected", () => console.log("MongoDB connection restored."));
  // Give up on an unreachable database after 8 seconds (the default is 30), so a page never waits half a minute.
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  console.log("MongoDB connected");
  app.listen(env.PORT, () => console.log(`PawLedger API listening on port ${env.PORT}`));
}

main().catch((err) => {
  console.error("Failed to start:", err instanceof Error ? err.message : err);
  console.error("Run `npm run doctor` (from the project folder) to see what to fix.");
  console.error("If this worked before, your IP address has probably changed: in Atlas, open Network Access and choose Add Current IP Address.");
  process.exit(1);
});
