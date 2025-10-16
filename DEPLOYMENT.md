# Deploying Integra OS to Companies

This guide explains how to deploy Integra OS to different companies.

## Deployment Architecture

\`\`\`
┌─────────────────────────────────────────┐
│         Company Network                  │
│                                          │
│  ┌──────────────┐                       │
│  │ Server PC    │                       │
│  │ (Windows)    │                       │
│  │              │                       │
│  │ integra-     │                       │
│  │ server.exe   │                       │
│  │              │                       │
│  │ IP: 192.168. │                       │
│  │     1.100    │                       │
│  └──────┬───────┘                       │
│         │                                │
│         │ Local Network                 │
│         │                                │
│  ┌──────┴───────┬───────────┬──────────┤
│  │              │           │          │
│  ▼              ▼           ▼          ▼
│ Tablet 1    Tablet 2    Desktop 1  Desktop 2
│ (Browser)   (Browser)   (Electron) (Electron)
│                                          │
└─────────────────────────────────────────┘
\`\`\`

## Installation Steps

### 1. Server Installation (One-Time per Company)

**On the designated server machine:**

1. Run `integra-server-setup.exe`
2. Follow installation wizard:
   - Choose installation directory
   - Set port (default: 3001)
   - Enable "Run on startup" (recommended)
3. Note the server's IP address:
   - Open Command Prompt
   - Type: `ipconfig`
   - Look for "IPv4 Address" (e.g., `192.168.1.100`)
4. Configure Windows Firewall:
   - Allow incoming connections on port 3001
   - Or disable firewall for local network

**Server will now run automatically on startup.**

### 2. Client Installation (Each Device)

**Option A: Desktop App (Recommended)**

1. Run `Integra-OS-Setup.exe` on each device
2. On first launch:
   - Enter server IP: `http://192.168.1.100:3001`
   - Enter device name: "Shop Floor Tablet 1"
   - Click "Connect"
3. Done! The device is now connected.

**Option B: Browser Access (No Installation)**

1. Open any web browser
2. Navigate to: `http://192.168.1.100:3000`
3. On first visit:
   - Enter server IP: `http://192.168.1.100:3001`
   - Enter device name: "Manager Desktop"
   - Click "Connect"

### 3. Initial Configuration

**On any device (as Administrator):**

1. Log in as Administrator (default passcode: 1234)
2. Configure company settings:
   - Add users
   - Set up layouts for each role
   - Add announcements
   - Upload notices/PDFs
   - Add custom apps

**All devices will automatically sync these settings.**

---

## Multi-Company Deployment

### Each company needs:
1. **One server machine** running `integra-server.exe`
2. **Multiple client devices** accessing the server

### Data Isolation:
- Each company has its own server
- Data is stored locally on each company's server
- No data is shared between companies
- Each company's network is isolated

---

## Network Requirements

### Server Machine:
- Windows 10/11
- Static IP address (recommended)
- Port 3001 open on firewall
- Always-on (or scheduled startup)

### Client Devices:
- Windows 10/11 (for desktop app)
- Any device with modern browser (for browser access)
- Connected to same local network as server

---

## Backup & Maintenance

### Backing Up Data:

**Server data location:**
\`\`\`
C:\Program Files\IntegraServer\integra.db
C:\Program Files\IntegraServer\uploads\
\`\`\`

**Backup procedure:**
1. Stop the server (close integra-server.exe)
2. Copy `integra.db` and `uploads/` folder
3. Store backup in safe location
4. Restart server

**Automated backup (optional):**
- Use Windows Task Scheduler
- Schedule daily copy of database file

### Updating the Server:

1. Stop the server
2. Run new `integra-server-setup.exe`
3. Choose "Upgrade" when prompted
4. Restart server

**All client devices will automatically use the updated server.**

---

## Troubleshooting

### Server Issues:

**Server won't start:**
- Check if port 3001 is in use
- Run as Administrator
- Check Windows Firewall

**Can't access from other devices:**
- Verify server IP address
- Check firewall settings
- Ensure devices are on same network

### Client Issues:

**Can't connect to server:**
- Verify server IP is correct
- Ping server: `ping 192.168.1.100`
- Check network connection

**Changes not syncing:**
- Check server connection indicator
- Refresh the page/app
- Verify server is running

---

## Security Considerations

### Network Security:
- Server should only be accessible on local network
- Do not expose server to internet
- Use company firewall for network isolation

### Access Control:
- Change default administrator passcode
- Create unique passcodes for each role
- Regularly review user access

### Data Security:
- Regular backups of database
- Secure physical access to server machine
- Consider encrypting backup files

---

## Support

For technical support or questions:
- Check BUILD.md for build instructions
- Review server logs in installation directory
- Contact Integra Systems support
