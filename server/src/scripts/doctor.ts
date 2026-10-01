// `npm run doctor`: checks the configuration and the database connection, and says what to fix.
import mongoose from "mongoose";

async function main() {
  console.log("PawLedger doctor\n");

  let env: typeof import("../config/env").env;
  try {
    env = (await import("../config/env")).env;
    console.log("  ok    server/.env is complete");
  } catch (err) {
    console.log(`  FAIL  ${err instanceof Error ? err.message : err}`);
    console.log('\n  Fix: run "npm run setup" (it writes server/.env for you), or copy server/.env.example and fill it in.');
    process.exit(1);
  }

  const target = env.MONGODB_URI.replace(/\/\/([^:/@]+):([^@]*)@/, "//$1:****@"); // never print the password
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 6000 });
    console.log(`  ok    connected to MongoDB (${target})`);
    const users = await mongoose.connection.collection("users").countDocuments();
    console.log(`  ok    ${users} ${users === 1 ? "account" : "accounts"} in the database`);
    console.log(env.ALLOW_REGISTRATION ? "  note  registration is OPEN: create your account, then set ALLOW_REGISTRATION=false" : "  ok    registration is closed");
    console.log(`  info  client is ${env.SERVE_CLIENT ? "served by this server (single-service mode)" : "separate (dev server or static host)"}`);
    console.log("\nAll good.");
  } catch (err) {
    console.log(`  FAIL  could not connect to MongoDB (${target})`);
    console.log(`        ${err instanceof Error ? err.message.split("\n")[0] : err}`);
    console.log("\n  Things to check:");
    console.log("   - Local MongoDB: is it running? (mongod, or the MongoDB service)");
    console.log("   - Atlas: is your current IP address on the Network Access list? It changes when your network or internet connection changes.");
    console.log("     Fix: Atlas > Network Access > Add Current IP Address, then wait a minute until it says Active.");
    console.log("   - Atlas: are the database user and password right, with no < > brackets left around them?");
    console.log("   - Special characters in the password must be URL-encoded (@ becomes %40).");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }
}
main();
