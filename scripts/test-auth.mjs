/**
 * Auth endpoint smoke test
 * Run: node scripts/test-auth.mjs
 *
 * Registration returns 403 unless the API has ALLOW_PUBLIC_REGISTRATION=true.
 * Example: ALLOW_PUBLIC_REGISTRATION=true node scripts/test-auth.mjs
 */

const API = "http://localhost:4000";

async function pretty(label, res) {
  const body = await res.json();
  const divider = "=".repeat(52);
  console.log(`\n${divider}`);
  console.log(`${label}`);
  console.log(`HTTP ${res.status}`);
  console.log(divider);
  console.log(JSON.stringify(body, null, 2));
  return body;
}

// 1. Register
let regRes = await fetch(`${API}/auth/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "admin@ims.local",
    password: "Admin@1234",
    name: "Super Admin",
    role: "SUPER_ADMIN"
  })
});
const regData = await pretty("POST /auth/register", regRes);
if (regRes.status === 403) {
  console.log("\n(Register skipped: set ALLOW_PUBLIC_REGISTRATION=true to test registration.)\n");
}

// 2. Login
let loginRes = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "admin@ims.local",
    password: "Admin@1234"
  })
});
const loginData = await pretty("POST /auth/login", loginRes);

// 3. GET /auth/me with access token
if (loginData.accessToken) {
  const meRes = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.accessToken}` }
  });
  await pretty("GET /auth/me (protected)", meRes);
}
