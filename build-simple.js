const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

console.log("🚀 Building Integra OS Server Package...\n")

// Step 1: Build Next.js
console.log("📦 Building Next.js application...")
try {
  execSync("npm run build", { stdio: "inherit" })
} catch (error) {
  console.error("❌ Build failed")
  process.exit(1)
}

// Step 2: Create deployment folder
console.log("\n📁 Creating deployment package...")
const deployDir = path.join(process.cwd(), "integra-os-server")

if (fs.existsSync(deployDir)) {
  try {
    console.log("🗑️  Removing old deployment folder...")
    fs.rmSync(deployDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 })
  } catch (error) {
    console.error("\n❌ Error: Could not delete the old 'integra-os-server' folder.")
    console.error("   The folder may be in use by another program.\n")
    console.error("   Please:")
    console.error("   1. Stop any running Integra OS server")
    console.error("   2. Close File Explorer windows showing this folder")
    console.error("   3. Manually delete the 'integra-os-server' folder")
    console.error("   4. Run this build script again\n")
    process.exit(1)
  }
}
fs.mkdirSync(deployDir, { recursive: true })

// Step 3: Copy necessary files
console.log("📋 Copying files...")

// Copy .next folder
const nextDir = path.join(process.cwd(), ".next")
const targetNextDir = path.join(deployDir, ".next")
if (fs.existsSync(nextDir)) {
  fs.cpSync(nextDir, targetNextDir, { recursive: true })
}

// Copy public folder
const publicDir = path.join(process.cwd(), "public")
const targetPublicDir = path.join(deployDir, "public")
if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, targetPublicDir, { recursive: true })
}

// Copy package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"))
const serverPackageJson = {
  name: packageJson.name,
  version: packageJson.version,
  scripts: {
    start: "next start -p 3001",
  },
  dependencies: packageJson.dependencies,
}
fs.writeFileSync(path.join(deployDir, "package.json"), JSON.stringify(serverPackageJson, null, 2))

// Copy next.config.mjs
if (fs.existsSync("next.config.mjs")) {
  fs.copyFileSync("next.config.mjs", path.join(deployDir, "next.config.mjs"))
}

console.log("🔑 Configuring environment variables...")
const envContent = `# Integra OS Environment Variables
# Auto-generated from v0 workspace

FULCRUM_API_KEY=${process.env.FULCRUM_API_KEY || ""}
BLOB_READ_WRITE_TOKEN=${process.env.BLOB_READ_WRITE_TOKEN || ""}
`
fs.writeFileSync(path.join(deployDir, ".env.local"), envContent)
console.log("✅ Environment variables configured automatically!")

if (fs.existsSync(".env.example")) {
  fs.copyFileSync(".env.example", path.join(deployDir, ".env.example"))
}

// Step 4: Create startup scripts
console.log("🔧 Creating startup scripts...")

// Windows batch file
const batchContent = `@echo off
echo ========================================
echo    Starting Integra OS Server
echo ========================================
echo.

REM Get the local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do set IP=%%a
set IP=%IP:~1%

echo Server will be available at:
echo   Local:   http://localhost:3001
echo   Network: http://%IP%:3001
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
  echo Installing dependencies with legacy peer deps...
  echo This may take a few minutes...
  echo.
  call npm install --production --legacy-peer-deps
  if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    echo Please check your internet connection and try again
    pause
    exit /b 1
  )
  echo.
  echo Dependencies installed successfully!
  echo.
)

REM Start the server
echo Starting Integra OS...
call npm start

if errorlevel 1 (
  echo.
  echo ERROR: Failed to start server
  pause
  exit /b 1
)

pause
`
fs.writeFileSync(path.join(deployDir, "START-INTEGRA-OS.bat"), batchContent)

// PowerShell script with network IP detection
const psContent = `Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Starting Integra OS Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress

Write-Host "Server will be available at:" -ForegroundColor Yellow
Write-Host "  Local:   http://localhost:3001" -ForegroundColor White
Write-Host "  Network: http://$IP:3001" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install --production --legacy-peer-deps
    Write-Host ""
}

# Start the server
npm start
`
fs.writeFileSync(path.join(deployDir, "START-INTEGRA-OS.ps1"), psContent)

// README with network access instructions
const readmeContent = `# Integra OS Server

## Installation

1. Copy this entire folder to your server computer
2. Make sure Node.js is installed (download from nodejs.org)
3. **IMPORTANT: Configure environment variables (see below)**

## Environment Variables Setup

Before starting the server, you need to configure your API keys:

1. Copy \`.env.example\` to \`.env.local\`
2. Edit \`.env.local\` and add your API keys:
   - **FULCRUM_API_KEY**: Get from https://integrasystems.fulcrumpro.com/settings/api
   - **BLOB_READ_WRITE_TOKEN**: Optional (uses filesystem if not set)

Example \`.env.local\` file:
\`\`\`
FULCRUM_API_KEY=your_actual_api_key_here
\`\`\`

**Without the FULCRUM_API_KEY, the following features will not work:**
- Real-Time Operations widget
- Time Clock integration
- Fulcrum data synchronization

## Starting the Server

### Option 1: Double-click (Recommended)
- Double-click \`START-INTEGRA-OS.bat\`
- The script will show you the network address to use

### Option 2: Command Line
\`\`\`bash
npm install --production --legacy-peer-deps
npm start
\`\`\`

## Accessing Integra OS

Once started, the server will display two addresses:

**From the server computer:**
- http://localhost:3001

**From other devices on the network:**
- http://[SERVER-IP]:3001 (the script will show you the exact address)

Example: http://10.8.0.210:3001

## Connecting Other Devices

1. Start the server on the main computer
2. Note the "Network" address shown (e.g., http://10.8.0.210:3001)
3. On other devices, open a browser and enter that address
4. When prompted for "Server URL", enter the network address

## Firewall Configuration

If other devices can't connect, you may need to allow port 3001 through Windows Firewall:

1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Enter port 3001 → Next
6. Allow the connection → Next
7. Apply to all profiles → Next
8. Name it "Integra OS" → Finish

## Updating

To update Integra OS:
1. Stop the server (Ctrl+C)
2. **BACKUP your .env.local file** (contains your API keys)
3. Replace this folder with the new version
4. **RESTORE your .env.local file**
5. Delete the \`node_modules\` folder
6. Start the server again (it will reinstall dependencies)

## Troubleshooting

**"Fulcrum API key not configured" error?**
- Make sure you created a \`.env.local\` file
- Verify your FULCRUM_API_KEY is correct
- Restart the server after adding the API key

**"Could not connect to server" error?**
- Make sure you're using the network IP address, not localhost
- Check that Windows Firewall allows port 3001
- Verify both devices are on the same network

**Port already in use?**
- Edit package.json and change \`-p 3001\` to a different port
- Update firewall rules for the new port

**Dependency errors during install?**
- The \`--legacy-peer-deps\` flag is included to handle React version conflicts
- This is normal and safe for this application
`
fs.writeFileSync(path.join(deployDir, "README.md"), readmeContent)

console.log("\n✅ Build complete!")
console.log(`\n📦 Server package created in: ${deployDir}`)
console.log("\n⚠️  IMPORTANT: Configure environment variables before starting!")
console.log("   1. Go to the integra-os-server folder")
console.log("   2. Copy .env.example to .env.local")
console.log("   3. Edit .env.local and add your FULCRUM_API_KEY")
console.log("   4. Get your API key from: https://integrasystems.fulcrumpro.com/settings/api")
console.log("\n📝 Next steps:")
console.log('1. Copy the "integra-os-server" folder to your server computer')
console.log("2. Configure .env.local with your API keys")
console.log("3. Double-click START-INTEGRA-OS.bat to run")
console.log("4. Access from any browser at http://server-ip:3001\n")
