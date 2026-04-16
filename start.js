const ngrok = require("ngrok");
const { execSync, spawn } = require("child_process");
const fs = require("fs");

async function start() {
  console.log("Starting proxy server...");

  // Start the proxy server as a child process
  const server = spawn("node", ["server.js"], {
    stdio: "inherit",
    env: { ...process.env, PORT: "3000" },
  });

  // Wait a moment for server to start
  await new Promise((r) => setTimeout(r, 2000));

  console.log("Starting ngrok tunnel...");

  const url = await ngrok.connect({
    addr: 3000,
    onStatusChange: (status) => console.log("ngrok status:", status),
    onLogEvent: (data) => {},
  });

  console.log("\n========================================");
  console.log("  PROXY IS LIVE!");
  console.log(`  URL: ${url}`);
  console.log("========================================\n");

  // Write URL to a file so it can be retrieved
  fs.writeFileSync("ngrok-url.txt", url);

  // Handle cleanup
  process.on("SIGTERM", async () => {
    await ngrok.kill();
    server.kill();
    process.exit(0);
  });
}

start().catch(console.error);
