# Integra OS Server

Local server for Integra OS that stores all data and synchronizes across devices on the same network.

## Development

1. Install dependencies:
\`\`\`bash
cd server
npm install
\`\`\`

2. Run development server:
\`\`\`bash
npm run dev
\`\`\`

The server will start on http://localhost:3001

## Building .exe

1. Build TypeScript:
\`\`\`bash
npm run build
\`\`\`

2. Package as .exe:
\`\`\`bash
npm run package
\`\`\`

This creates `integra-server.exe` that can be distributed to other companies.

## Deployment

1. Copy `integra-server.exe` to the target machine
2. Run the .exe file
3. The server will start and create `integra-data.db` in the same directory
4. Configure clients to connect to `http://[server-ip]:3001`

## Database

The server uses SQLite with a single file `integra-data.db` that stores:
- Complete application state
- User settings and layouts
- Announcements
- Custom apps
- Notice board PDFs

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/state` - Get full application state
- `POST /api/state` - Save full application state
- `POST /api/upload-pdf` - Upload PDF file
- `DELETE /api/delete-pdf` - Delete PDF file
