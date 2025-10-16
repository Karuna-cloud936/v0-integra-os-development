# Network Setup Guide for Integra OS

## Quick Start

1. **Build the server package:**
   \`\`\`bash
   npm install --legacy-peer-deps
   npm run build-server
   \`\`\`

2. **Copy to server computer:**
   - Copy the entire `integra-os-server` folder to your server computer

3. **Start the server:**
   - Double-click `START-INTEGRA-OS.bat`
   - Note the network address shown (e.g., http://10.8.0.210:3001)

4. **Connect from other devices:**
   - Open browser on any device
   - Enter the network address from step 3
   - When Integra OS asks for "Server URL", enter that same address

## Windows Firewall Setup

If devices can't connect, configure Windows Firewall:

### Method 1: Quick Command (Run as Administrator)
\`\`\`powershell
netsh advfirewall firewall add rule name="Integra OS" dir=in action=allow protocol=TCP localport=3001
