import assert from "node:assert/strict";
import test from "node:test";
import { buildEnvFile, newSecret, nodeMajor, normalizeMongoUri, setEnvValue } from "./lib.mjs";

test("accepts a local and an Atlas connection string", () => {
  assert.equal(normalizeMongoUri("mongodb://127.0.0.1:27017/pawledger").ok, true);
  const atlas = normalizeMongoUri("mongodb+srv://sarah:s3cret@cluster0.ab1cd.mongodb.net/?retryWrites=true&w=majority");
  assert.equal(atlas.ok, true);
  assert.match(atlas.uri, /\/pawledger\?retryWrites=true&w=majority$/); // database name added, options kept
  assert.match(atlas.note, /pawledger/);
});

test("keeps a database name the person already chose", () => {
  const r = normalizeMongoUri("mongodb+srv://u:p@cluster0.ab1cd.mongodb.net/myledger?retryWrites=true");
  assert.match(r.uri, /\/myledger\?/);
  assert.equal(r.note, undefined);
});

test("rejects things that are not connection strings, and Atlas placeholders left in", () => {
  for (const bad of ["", "localhost:27017", "http://example.com", "postgres://x"]) assert.equal(normalizeMongoUri(bad).ok, false, bad);
  const placeholder = normalizeMongoUri("mongodb+srv://sarah:<db_password>@cluster0.ab1cd.mongodb.net/");
  assert.equal(placeholder.ok, false);
  assert.match(placeholder.error, /placeholder/);
});

test("explains an unencoded special character in the password", () => {
  const r = normalizeMongoUri("mongodb+srv://sarah:p@ss:w/rd@cluster0.ab1cd.mongodb.net/");
  if (!r.ok) assert.match(r.error, /URL-encode/);
});

test("never reports the password back in an error", () => {
  const r = normalizeMongoUri("mongodb+srv://sarah:<db_password>@cluster0.ab1cd.mongodb.net/");
  assert.doesNotMatch(r.error, /sarah|cluster0/);
});

test("secrets are long enough for the server and never repeat", () => {
  const a = newSecret(), b = newSecret();
  assert.ok(a.length >= 32);
  assert.notEqual(a, b);
});

test("the generated .env passes the server's own rules and starts with registration open", () => {
  const text = buildEnvFile({ uri: "mongodb://127.0.0.1:27017/pawledger", secret: newSecret() });
  const get = (k) => text.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1];
  assert.equal(get("ALLOW_REGISTRATION"), "true");
  assert.equal(get("SERVE_CLIENT"), "false");
  assert.ok(get("JWT_SECRET").length >= 32);
  assert.match(get("MONGODB_URI"), /^mongodb/);
});

test("setEnvValue changes one line and adds a missing one", () => {
  const text = "A=1\nALLOW_REGISTRATION=true\nB=2\n";
  assert.equal(setEnvValue(text, "ALLOW_REGISTRATION", "false"), "A=1\nALLOW_REGISTRATION=false\nB=2\n");
  assert.equal(setEnvValue("A=1", "ALLOW_REGISTRATION", "false"), "A=1\nALLOW_REGISTRATION=false\n");
});

test("reads the Node major version", () => {
  assert.equal(nodeMajor("22.22.2"), 22);
  assert.equal(nodeMajor("18.0.0"), 18);
});

test("catches brackets kept around a username or password someone typed in", () => {
  for (const bad of [
    "mongodb+srv://<someuser>:<somepass>@cluster0.ab1cd.mongodb.net/?appName=Cluster0", // both
    "mongodb+srv://<someuser>:plainpass@cluster0.ab1cd.mongodb.net/?appName=Cluster0", // username only: the real first-run case
    "mongodb+srv://someuser:<somepass>@cluster0.ab1cd.mongodb.net/",
  ]) {
    const r = normalizeMongoUri(bad);
    assert.equal(r.ok, false, bad);
    assert.match(r.error, /brackets/);
    assert.doesNotMatch(r.error, /someuser|somepass|plainpass|cluster0/); // never echo credentials
  }
});

test("still accepts a clean Atlas string", () => {
  assert.equal(normalizeMongoUri("mongodb+srv://someuser:plainpass@cluster0.ab1cd.mongodb.net/?appName=Cluster0").ok, true);
});
