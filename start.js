const ngrok = require("@ngrok/ngrok");
const { spawn } = require("child_process");

const INTERNAL_PORT = 4242;

async function start() {
  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    console.error("ERROR: NGROK_AUTHTOKEN environment variable is not set!");
    process.exit(1);
  }

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

  console.log("Starting ngrok tunnel...");

  const listener = await ngrok.forward({
    addr: INTERNAL_PORT,
    authtoken,
  });

  const url = listener.url();

  console.log("\n========================================");
  console.log("  PROXY IS LIVE!");
  console.log(`  URL: ${url}`);
  console.log("========================================\n");

  setInterval(() => console.log("alive — tunnel:", url), 30000);

  process.on("SIGTERM", async () => {
    await ngrok.disconnect();
    server.kill();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
