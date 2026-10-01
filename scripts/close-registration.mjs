#!/usr/bin/env node
// `npm run close-registration`: once your account exists, stop anyone else from creating one.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setEnvValue } from "./lib.mjs";

const root = process.env.PAWLEDGER_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "server", ".env");

if (!fs.existsSync(envPath)) {
  console.log("There is no server/.env yet, so there is nothing to change. Run `npm run setup` first.");
  process.exit(1);
}
const before = fs.readFileSync(envPath, "utf8");
if (/^ALLOW_REGISTRATION=false\s*$/m.test(before)) {
  console.log("Registration is already closed.");
  process.exit(0);
}
fs.writeFileSync(envPath, setEnvValue(before, "ALLOW_REGISTRATION", "false"));
console.log("Registration is now closed. Restart the server (stop `npm run dev` and start it again) for this to take effect.");
console.log("On Render, set ALLOW_REGISTRATION to false in the service's Environment tab instead.");
