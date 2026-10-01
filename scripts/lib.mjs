// Pure helpers for the setup scripts. No prompts and no file access here, so they are easy to test.
import crypto from "node:crypto";

/** Checks a MongoDB connection string and adds a database name when Atlas's copy-paste string has none. */
export function normalizeMongoUri(input) {
  const raw = String(input).trim();
  if (!/^mongodb(\+srv)?:\/\//.test(raw)) {
    return { ok: false, error: "A MongoDB connection string starts with mongodb:// or mongodb+srv://" };
  }
  if (/<\s*(db_)?password\s*>|<\s*username\s*>/i.test(raw)) {
    return { ok: false, error: "The string still has a <password> placeholder. Replace it, brackets included, with your database user's password." };
  }
  // Atlas's example string wraps its placeholders in <angle brackets>. People often replace the words but keep the
  // brackets (<myuser>:<mypassword>), which makes the login fail. Look only at the part before the "@", and never echo it.
  const at = raw.lastIndexOf("@");
  if (at > 0 && /[<>]/.test(raw.slice(raw.indexOf("://") + 3, at))) {
    return { ok: false, error: "The username or password still has < > brackets around it. In Atlas's example those brackets are part of the placeholder: remove them together with the placeholder word, leaving just your real username and password." };
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, error: "That doesn't read as a connection string. If the password contains characters like @ : / or #, URL-encode them (for example @ becomes %40)." };
  }
  let note;
  if (url.pathname === "" || url.pathname === "/") {
    url.pathname = "/pawledger";
    note = 'No database name was in the string, so "pawledger" was added.';
  }
  return { ok: true, uri: url.toString(), note };
}

export const newSecret = () => crypto.randomBytes(48).toString("hex");

/** The text of server/.env for a first run. Registration starts open so you can create your account. */
export function buildEnvFile({ uri, secret }) {
  return `# PawLedger server settings. Never commit or share this file.

PORT=4000
MONGODB_URI=${uri}
JWT_SECRET=${secret}

# Open while you create your own account. "npm run close-registration" sets it to false.
ALLOW_REGISTRATION=true

CLIENT_URL=http://localhost:5173
COOKIE_SAMESITE=lax

# Leave false for "npm run dev". Single-service hosting (Render) sets it to true.
SERVE_CLIENT=false
`;
}

/** Sets KEY=value in .env text, adding the line if it is missing. Other lines are left alone. */
export function setEnvValue(text, key, value) {
  const re = new RegExp(`^${key}=.*$`, "m");
  return re.test(text) ? text.replace(re, `${key}=${value}`) : `${text.replace(/\n*$/, "\n")}${key}=${value}\n`;
}

export const nodeMajor = (version = process.versions.node) => Number(version.split(".")[0]);
