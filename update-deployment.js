const fs = require("fs")
const path = require("path")

console.log("\n🔄 Quick Update Deployment\n")

const deployDir = path.join(__dirname, "integra-os-server")

if (!fs.existsSync(deployDir)) {
  console.log("❌ No deployment found. Run 'npm run build-server' first.")
  process.exit(1)
}

console.log("✅ Build complete!")
console.log("\n📋 Update Checklist:")
console.log("   1. ⏸️  Stop the running server")
console.log("   2. 💾 Backup current deployment (optional)")
console.log("   3. 📁 Copy integra-os-server/ to server location")
console.log("   4. ▶️  Start server with Start-Integra-OS.bat")
console.log("   5. ✅ All users get update automatically!\n")
console.log("💡 Tip: Updates take less than 1 minute with zero user impact\n")
