const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

console.log("🚀 Building Integra OS Standalone Installer...\n")

// Step 1: Create standalone server file
console.log("📦 Creating standalone server...")
const serverCode = `
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const dev = false;
const hostname = 'localhost';
const port = 3001;

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(\`
╔════════════════════════════════════════════╗
║                                            ║
║         🚀 Integra OS Server Running       ║
║                                            ║
║   Open your browser and navigate to:      ║
║   http://localhost:3001                    ║
║                                            ║
║   Press Ctrl+C to stop the server          ║
║                                            ║
╚════════════════════════════════════════════╝
      \`);
      
      // Auto-open browser
      const { exec } = require('child_process');
      exec('start http://localhost:3001');
    });
});
`

fs.writeFileSync("server.js", serverCode)
console.log("✅ Server file created\n")

// Step 2: Create package.json for pkg
console.log("📝 Creating pkg configuration...")
const pkgConfig = {
  name: "integra-os-server",
  version: "1.0.3",
  main: "server.js",
  pkg: {
    assets: [".next/**/*", "public/**/*", "node_modules/next/dist/**/*"],
    targets: ["node18-win-x64"],
    outputPath: "dist",
  },
}

fs.writeFileSync("pkg-config.json", JSON.stringify(pkgConfig, null, 2))
console.log("✅ Configuration created\n")

// Step 3: Create dist directory
if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist")
}

// Step 4: Build with pkg
console.log("🔨 Building executable (this may take 5-10 minutes)...")
try {
  execSync("npx pkg server.js --targets node18-win-x64 --output dist/Integra-OS.exe", {
    stdio: "inherit",
  })
  console.log("\n✅ Build complete!\n")
  console.log("📍 Your installer is ready at: dist/Integra-OS.exe\n")
  console.log("🎉 You can now distribute this .exe file!\n")
} catch (error) {
  console.error("❌ Build failed:", error.message)
  process.exit(1)
}

// Cleanup
fs.unlinkSync("server.js")
fs.unlinkSync("pkg-config.json")
