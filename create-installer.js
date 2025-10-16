const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

console.log("🚀 Building Integra OS Installer...\n")

// Step 1: Build Next.js app
console.log("📦 Building Next.js application...")
try {
  execSync("npm run build", { stdio: "inherit" })
  console.log("✅ Next.js build complete\n")
} catch (error) {
  console.error("❌ Build failed")
  process.exit(1)
}

// Step 2: Create dist directory
const distDir = path.join(__dirname, "dist")
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir)
}

// Step 3: Create startup script
console.log("📝 Creating startup script...")
const startupScript = `@echo off
title Integra OS Server
echo.
echo ╔════════════════════════════════════════════╗
echo ║                                            ║
echo ║         🚀 Starting Integra OS...          ║
echo ║                                            ║
echo ╚════════════════════════════════════════════╝
echo.
echo Starting server...
cd /d "%~dp0"
start http://localhost:3001
node server.js
pause
`

fs.writeFileSync(path.join(distDir, "start-integra-os.bat"), startupScript)
console.log("✅ Startup script created\n")

// Step 4: Create server file
console.log("📝 Creating server file...")
const serverCode = `const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = 'localhost';
const port = 3001;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  }).listen(port, () => {
    console.log('✅ Integra OS is running at http://localhost:3001');
    console.log('Press Ctrl+C to stop');
  });
});
`

fs.writeFileSync(path.join(distDir, "server.js"), serverCode)
console.log("✅ Server file created\n")

// Step 5: Create README
const readme = `# Integra OS - Installation Instructions

## Quick Start

1. Double-click "start-integra-os.bat"
2. Your browser will open automatically to http://localhost:3001
3. Integra OS is now running!

## Requirements

- Node.js must be installed on the computer
- Download from: https://nodejs.org

## First Time Setup

Before running Integra OS for the first time:

1. Open Command Prompt in this folder
2. Run: npm install
3. Then double-click "start-integra-os.bat"

## Troubleshooting

**Port already in use?**
- Close any other applications using port 3001
- Or edit server.js and change the port number

**Browser doesn't open?**
- Manually open your browser
- Go to: http://localhost:3001

**Need help?**
- Contact your system administrator
`

fs.writeFileSync(path.join(distDir, "README.txt"), readme)
console.log("✅ README created\n")

// Step 6: Copy necessary files
console.log("📋 Copying application files...")
const filesToCopy = ["package.json", "next.config.mjs", ".next", "public", "node_modules"]

filesToCopy.forEach((file) => {
  const src = path.join(__dirname, file)
  const dest = path.join(distDir, file)

  if (fs.existsSync(src)) {
    if (fs.lstatSync(src).isDirectory()) {
      copyDir(src, dest)
    } else {
      fs.copyFileSync(src, dest)
    }
  }
})

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

console.log("✅ Files copied\n")

console.log("╔════════════════════════════════════════════╗")
console.log("║                                            ║")
console.log("║   ✅ Build Complete!                       ║")
console.log("║                                            ║")
console.log("║   Your installer is ready in:              ║")
console.log("║   dist/                                    ║")
console.log("║                                            ║")
console.log("║   To distribute:                           ║")
console.log('║   1. Zip the entire "dist" folder          ║')
console.log("║   2. Send to users                         ║")
console.log('║   3. Users run "start-integra-os.bat"      ║')
console.log("║                                            ║")
console.log("╚════════════════════════════════════════════╝")
