# Simple Integra OS Build Guide

This guide provides the easiest way to create a distributable version of Integra OS.

## Prerequisites

- Node.js 18 or higher installed
- Windows operating system

## Build Steps

### 1. Install Dependencies

Open PowerShell in your Integra OS folder and run:

\`\`\`bash
npm install
\`\`\`

Wait for all dependencies to install (2-5 minutes).

### 2. Build the Distribution Package

Run this single command:

\`\`\`bash
npm run build-installer
\`\`\`

This will:
- Build your Next.js application
- Create a startup script
- Copy all necessary files to the `dist` folder
- Takes 2-5 minutes

### 3. Find Your Distribution Package

After the build completes, you'll have a `dist` folder containing:
- `start-integra-os.bat` - Double-click to run
- `server.js` - The server file
- `README.txt` - Instructions for users
- All application files

## Distribution

### To Share Integra OS:

1. Zip the entire `dist` folder
2. Send the zip file to users
3. Users extract and double-click `start-integra-os.bat`

### First Time Setup (Users):

Users need to run this once in the dist folder:
\`\`\`bash
npm install
\`\`\`

Then they can use `start-integra-os.bat` anytime.

## Using Integra OS

### To Start:
- Double-click `start-integra-os.bat`
- Browser opens automatically to `http://localhost:3001`

### To Stop:
- Press `Ctrl+C` in the console window
- Or close the console window

## Troubleshooting

**Build fails?**
- Delete `node_modules` folder
- Run `npm install` again
- Try `npm run build-installer` again

**Port 3001 already in use?**
- Close any other applications using port 3001
- Or edit `dist/server.js` to change the port number

**Browser doesn't open automatically?**
- Manually open browser
- Go to `http://localhost:3001`

## What You Get

This simplified approach:
- No complex Electron setup
- No dependency installation errors
- Simple batch file to run
- Easy to distribute
- Works on any Windows computer with Node.js

The distribution package runs a local web server and opens your browser automatically.
\`\`\`

\`\`\`typescriptreact file="build-standalone.js" isDeleted="true"
...deleted...
