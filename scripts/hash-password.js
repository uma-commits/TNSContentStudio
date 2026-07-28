#!/usr/bin/env node
// Usage: npm run hash-password -- 'your-new-password'
// Prints a SHA-256 hex hash to put in the ADMIN_PASSWORD_HASH env var.
// (SHA-256, not bcrypt — the check happens in Edge middleware, which only
// has Web Crypto available, not Node's crypto/bcrypt.)
const crypto = require("crypto");

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run hash-password -- 'your-new-password'");
  process.exit(1);
}

console.log(crypto.createHash("sha256").update(password).digest("hex"));
