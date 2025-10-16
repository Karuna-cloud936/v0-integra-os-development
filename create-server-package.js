const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

console.log("🚀 Building Integra OS Server Package...\n")

// Step 1: Build Next.js app
console.log("📦 Building Next.js application...")
try {
  execSync("npm run build", { stdio: "inherit" })
  console.log("✅ Next.js build complete\n")
} catch (error) {
  console.error("❌ Build failed")
  process.exit(1)
}

// Step 2: Create deployment directory
const deployDir = path.join(__dirname, "integra-os-server")
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true })
}
fs.mkdirSync(deployDir)

// Step 3: Create startup script
console.log("📝 Creating startup script...")
const startupScript = `@echo off
title Integra OS Server
cls
echo.
echo ╔════════════════════════════════════════════╗
echo ║         🚀 Integra OS Server v1.0.3        ║
echo ╚════════════════════════════════════════════╝
echo.
echo Starting server on port 3001...
echo.
echo Access Integra OS at: http://localhost:3001
echo Or from other computers: http://%COMPUTERNAME%:3001
echo.
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
start http://localhost:3001
node server.js
`

fs.writeFileSync(path.join(deployDir, "Start-Integra-OS.bat"), startupScript)
console.log("✅ Startup script created")

// Step 4: Create server file
console.log("📝 Creating server file...")
const serverCode = `const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const hostname = '0.0.0.0'; // Allow network access
const port = 3001;
const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

console.log('Initializing Integra OS...');

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
  }).listen(port, hostname, () => {
    console.log('\\n✅ Integra OS is running!');
    console.log('   Local: http://localhost:3001');
    console.log('   Network: http://' + require('os').networkInterfaces()['Ethernet']?.[0]?.address + ':3001');
    console.log('\\nPress Ctrl+C to stop\\n');
  });
});
`

fs.writeFileSync(path.join(deployDir, "server.js"), serverCode)
console.log("✅ Server file created")

// Step 5: Copy necessary files
console.log("📋 Copying application files...")

// Copy standalone build
const standaloneDir = path.join(__dirname, ".next", "standalone")
if (fs.existsSync(standaloneDir)) {
  copyDir(standaloneDir, deployDir)
}

// Copy static files
const staticDir = path.join(__dirname, ".next", "static")
const destStaticDir = path.join(deployDir, ".next", "static")
if (fs.existsSync(staticDir)) {
  copyDir(staticDir, destStaticDir)
}

// Copy public folder
const publicDir = path.join(__dirname, "public")
const destPublicDir = path.join(deployDir, "public")
if (fs.existsSync(publicDir)) {
  copyDir(publicDir, destPublicDir)
}

console.log("✅ Files copied")

// Step 6: Create deployment README
const readme = `# Integra OS Server - Deployment Package

## 🚀 Quick Start

### First Time Installation:
1. Extract this folder to your server location (e.g., C:\\Integra-OS)
2. Make sure Node.js is installed (https://nodejs.org)
3. Double-click "Start-Integra-OS.bat"
4. Access from any computer on your network

### Access URLs:
- On this computer: http://localhost:3001
- From other computers: http://[SERVER-IP]:3001
  (Replace [SERVER-IP] with this computer's IP address)

## 🔄 How to Update (EASY!)

When you receive a new version:

1. **Stop the current server** (Close the window or press Ctrl+C)
2. **Backup your current folder** (optional but recommended)
3. **Extract the new version** to the same location
4. **Start the server again** by double-clicking "Start-Integra-OS.bat"

That's it! All users will automatically see the new version.

## 📡 Network Access

To allow other computers to access Integra OS:

1. Find this computer's IP address:
   - Open Command Prompt
   - Type: ipconfig
   - Look for "IPv4 Address" (e.g., 192.168.1.100)

2. On other computers, open a browser and go to:
   http://[IP-ADDRESS]:3001
   (Replace [IP-ADDRESS] with the IP from step 1)

3. If connection fails, check Windows Firewall:
   - Open Windows Firewall settings
   - Allow Node.js through the firewall
   - Or temporarily disable firewall for testing

## 🔧 Troubleshooting

**Port 3001 already in use?**
- Close any other applications using that port
- Or edit server.js and change the port number

**Can't access from other computers?**
- Check Windows Firewall settings
- Make sure all computers are on the same network
- Verify the server computer's IP address

**Server won't start?**
- Make sure Node.js is installed
- Run Command Prompt as Administrator
- Check for error messages in the console

## 📝 Version Information

Version: 1.0.3
Build Date: ${new Date().toLocaleDateString()}

## 💡 Tips

- Keep the server running 24/7 for best experience
- Bookmark the URL on user computers for easy access
- Updates take less than 1 minute with zero downtime
- All user data is stored on the server (no individual installations needed)
`

fs.writeFileSync(path.join(deployDir, "README.txt"), readme)
console.log("✅ README created")

// Step 7: Create update instructions
const updateInstructions = `# 🔄 UPDATE INSTRUCTIONS FOR ADMINISTRATORS

## How to Deploy Updates (Super Easy!)

### Step 1: Build the Update Package
On your development computer:
1. Make your code changes
2. Open terminal in the project folder
3. Run: npm run build-server
4. Find the new package in: integra-os-server/

### Step 2: Deploy to Server
1. Stop the running server (close the window)
2. Backup the current folder (optional)
3. Copy the new files over the old ones
4. Start the server again

### Step 3: Done!
All users will see the update immediately. No need to update individual computers.

## Zero-Downtime Updates (Advanced)

For minimal disruption:
1. Keep the old server running
2. Extract new version to a different folder
3. Start the new server on a different port (edit server.js)
4. Test the new version
5. Stop the old server
6. Update the new server to use port 3001
7. Restart

Total downtime: Less than 10 seconds!

## Version Control

Keep track of versions by:
- Naming folders: integra-os-v1.0.3, integra-os-v1.0.4, etc.
- Keeping old versions as backups
- Documenting changes in a changelog
`

fs.writeFileSync(path.join(deployDir, "UPDATE-GUIDE.txt"), updateInstructions)
console.log("✅ Update guide created")

// Helper function to copy directories
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

console.log("\n╔════════════════════════════════════════════╗")
console.log("║                                            ║")
console.log("║   ✅ SERVER PACKAGE READY!                 ║")
console.log("║                                            ║")
console.log("║   Location: integra-os-server/             ║")
console.log("║                                            ║")
console.log("║   📦 To Deploy:                            ║")
console.log("║   1. Copy the entire folder to server      ║")
console.log('║   2. Run "Start-Integra-OS.bat"            ║')
console.log("║   3. Access from any computer on network   ║")
console.log("║                                            ║")
console.log("║   🔄 To Update Later:                      ║")
console.log("║   1. Build new package (npm run build-server) ║")
console.log("║   2. Copy over old files                   ║")
console.log("║   3. Restart server                        ║")
console.log("║   4. Everyone gets update instantly!       ║")
console.log("║                                            ║")
console.log("╚════════════════════════════════════════════╝\n")
