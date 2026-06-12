// Runs before each test file — must set env before src/config/env.ts loads.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "file:./test.db";
process.env.JWT_ACCESS_SECRET = "test-access-secret-0123456789abcdef0123456789";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-0123456789abcdef012345678";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.LLM_PROVIDER = "demo";
// Secret only (no APP_ID): webhook signature verification is active while
// checkout stays in simulated mode.
process.env.CASHFREE_SECRET_KEY = "test-cashfree-secret";
