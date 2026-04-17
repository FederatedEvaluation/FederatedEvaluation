#!/usr/bin/env node
const { execSync } = require("child_process");
const os = require("os");

const ports = [3000, 8000, 8010];

function killOnUnix(port) {
  try {
    const cmd = `lsof -ti :${port} | xargs kill -9`;
    execSync(cmd, { stdio: "ignore" });
    console.log(`Stopped processes on port ${port}`);
  } catch (err) {
    console.log(`No process stopped on port ${port} (may already be free).`);
  }
}

function killOnWindows(port) {
  try {
    const findCmd = `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`;
    execSync(findCmd, { stdio: "ignore" });
    console.log(`Stopped processes on port ${port}`);
  } catch (err) {
    console.log(`No process stopped on port ${port} (may already be free).`);
  }
}

function main() {
  const isWin = os.platform() === "win32";
  ports.forEach((port) => {
    if (isWin) {
      killOnWindows(port);
    } else {
      killOnUnix(port);
    }
  });
}

main();
