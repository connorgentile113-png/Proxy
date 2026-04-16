const ngrok = require("ngrok");
const { spawn } = require("child_process");

// Use port 4242 internally — avoids Render intercepting port 3000
const INTERNAL_PORT = 4242;

async function start() {
  console.log("Starting proxy server on internal port", INTERNAL_PORT);

  const server = spawn("node", ["server.js"], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(INTERNAL_PORT) },
  });

  server.on("error", (err) => {
    console.error("Server failed to start:", err);
    process.exit(1);
  });

  // Wait for server to be ready
  await new Promise((r) => setTimeout(r, 3000));

  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    console.error("ERROR: NGROK_AUTHTOKEN environment variable is not set!");
    console.error("Set it in your Render dashboard under Environment Variables.");
    process.exit(1);
  }

  console.log("Authenticating ngrok...");
  await ngrok.authtoken(authtoken);

  console.log("Starting ngrok tunnel...");
  const url = await ngrok.connect({
    addr: INTERNAL_PORT,
    onStatusChange: (status) => console.log("ngrok status:", status),
  });

  console.log("\n========================================");
  console.log("  PROXY IS LIVE!");
  console.log(`  URL: ${url}`);
  console.log("========================================\n");

  // Keep-alive log every 30s so Render doesn't think the process is dead
  setInterval(() => console.log("alive — tunnel:", url), 30000);

  process.on("SIGTERM", async () => {
    await ngrok.kill();
    server.kill();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
