import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      MONGODB_URI: "mongodb://placeholder",
      JWT_SECRET: "test-secret-test-secret-test-secret-1234",
      CLIENT_URL: "http://localhost:5173",
      ALLOW_REGISTRATION: "true",
    },
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
