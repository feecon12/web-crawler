#!/usr/bin/env node
// scripts/kill-browsers.js
// Utility script to kill any lingering browser processes

const { exec } = require("child_process");
const os = require("os");

function killBrowserProcesses() {
  const platform = os.platform();
  let killCommand;

  if (platform === "win32") {
    // Windows - kill Chrome and Edge processes
    killCommand =
      "taskkill /F /IM chrome.exe /IM msedge.exe /IM chromium.exe 2>nul";
  } else if (platform === "darwin") {
    // macOS
    killCommand = 'pkill -f "chrome|chromium|playwright"';
  } else {
    // Linux/Unix
    killCommand = 'pkill -f "chrome|chromium|playwright"';
  }

  console.log("🔍 Killing browser processes...");

  exec(killCommand, (error, stdout, stderr) => {
    if (error && error.code !== 1) {
      console.log("ℹ️  No browser processes found or already cleaned up");
    } else {
      console.log("✅ Browser processes cleaned up successfully");
    }

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes("not found")) console.log(stderr);
  });
}

// Run immediately if called directly
if (require.main === module) {
  killBrowserProcesses();
}

module.exports = { killBrowserProcesses };
