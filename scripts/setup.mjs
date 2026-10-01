#!/usr/bin/env node
// `npm run setup`: a guided first-time configuration. Asks a few questions, writes server/.env, checks the connection.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildEnvFile, newSecret, nodeMajor, normalizeMongoUri } from "./lib.mjs";

const root = process.env.PAWLEDGER_ROOT ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, "server", ".env");

// Reads answers one line at a time, so it works typed at a terminal and piped in from a file.
let checkFailed = false;
let wroteFile = false; // so the message on an early exit says what really happened
const rl = readline.createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
async function ask(question) {
  process.stdout.write(question);
  const { value, done } = await lines.next();
  if (done) {
    console.log(
      wroteFile
        ? "\n\nNo answer received, so the last step was skipped. server/.env was already written; run `npm run doctor` to check the connection."
        : "\n\nNo answer received, so nothing was changed. Run `npm run setup` again when you are ready.",
    );
    process.exit(1);
  }
  return String(value).trim();
}
const yes = (answer, dflt) => (answer === "" ? dflt : /^y(es)?$/i.test(answer));
const heading = (n, text) => console.log(`\n\u2500\u2500 Step ${n} of 4: ${text}\n`);

console.log("\nPawLedger setup");
console.log("This takes about two minutes. It asks a few questions, writes server/.env for you,");
console.log("and checks that the database answers. Nothing leaves your computer.");

// 1 ---------------------------------------------------------------
heading(1, "Check this computer");
const major = nodeMajor();
if (major < 20) {
  console.log(`Node ${process.versions.node} is too old. PawLedger needs Node 20 or newer (22 is best).`);
  console.log("Install it from https://nodejs.org, open a new terminal, and run this again.");
  process.exit(1);
}
console.log(`ok  Node ${process.versions.node}`);
if (!fs.existsSync(path.join(root, "node_modules"))) {
  console.log("\nThe project's packages aren't installed yet. Run:\n\n    npm install\n\nthen run `npm run setup` again.");
  process.exit(1);
}
console.log("ok  packages are installed");

// 2 ---------------------------------------------------------------
heading(2, "Choose where your data lives");
console.log("PawLedger keeps everything in MongoDB. Two easy options:");
console.log("  - MongoDB Atlas (free, in the cloud, works from anywhere). Paste its connection string.");
console.log("    It looks like: mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/");
console.log("  - MongoDB on this computer. Just press Enter.\n");
let uri;
for (let attempt = 1; attempt <= 3 && !uri; attempt++) {
  const answer = await ask("Connection string (Enter for local MongoDB): ");
  const result = normalizeMongoUri(answer === "" ? "mongodb://127.0.0.1:27017/pawledger" : answer);
  if (result.ok) {
    uri = result.uri;
    if (result.note) console.log(`    ${result.note}`);
  } else console.log(`    ${result.error}\n`);
}
if (!uri) {
  console.log("\nThat didn't work three times, so nothing was changed. The guide (GETTING-STARTED.md, step 3) shows where to find the string.");
  process.exit(1);
}

// 3 ---------------------------------------------------------------
heading(3, "Write the settings file");
let wrote = false;
if (fs.existsSync(envPath)) {
  console.log("server/.env already exists.");
  if (yes(await ask("Replace it with fresh settings? Your current file is kept as server/.env.backup. (y/N): "), false)) {
    fs.copyFileSync(envPath, `${envPath}.backup`);
    fs.writeFileSync(envPath, buildEnvFile({ uri, secret: newSecret() }), { mode: 0o600 });
    wrote = true;
    wroteFile = true;
    console.log("ok  replaced (old file saved as server/.env.backup)");
  } else console.log("ok  kept your existing file");
} else {
  fs.writeFileSync(envPath, buildEnvFile({ uri, secret: newSecret() }), { mode: 0o600 });
  wrote = true;
  wroteFile = true;
  console.log("ok  wrote server/.env with a freshly generated secret");
}

// 4 ---------------------------------------------------------------
heading(4, "Check the connection");
if (yes(await ask("Check that the database answers now? (Y/n): "), true)) {
  const r = spawnSync("npm", ["run", "doctor", "--silent"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) checkFailed = true;
} else console.log("Skipped. Run `npm run doctor` whenever you like.");

if (checkFailed) {
  console.log(`
\u2500\u2500 Saved, but the database check failed

  The settings were written to server/.env, but the app can't start until the database answers.
  Do NOT run "npm run dev" yet.

  1. Open server/.env and fix the MONGODB_URI line (the doctor's message above says what is wrong).
     Common causes: < > brackets left around the username or password, a wrong password,
     or your IP address not being allowed in Atlas -> Network Access.
  2. Run:  npm run doctor      until it ends with "All good."
  3. Then continue with:  npm run dev

The guide's troubleshooting table (GETTING-STARTED.md, section 13) lists each message and its fix.
`);
} else console.log(`
\u2500\u2500 You're set${wrote ? "" : " (settings unchanged)"}. What happens next

  1. Start the app:            npm run dev
  2. Open:                     http://localhost:5173
  3. Create your account and follow the welcome flow (it configures the app and tours it).
  4. Lock the door:            npm run close-registration     (then restart npm run dev)

The full walkthrough, with what you should see at each step, is in GETTING-STARTED.md.
`);
rl.close();
