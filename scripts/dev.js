#!/usr/bin/env node
/**
 * Cross-platform dev orchestrator (frontend + backend).
 * No external deps: mirrors wait-on + concurrently behavior in pure Node.
 */
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const FAIRNESS_BACKEND_URL = process.env.DEV_FAIRNESS_BACKEND_URL || "http://127.0.0.1:8000";
const D3EM_BACKEND_URL = process.env.DEV_D3EM_BACKEND_URL || "http://127.0.0.1:8010";
const FRONT_CMD = process.platform === "win32" ? "npm.cmd" : "npm";
const LOG_PREFIX = "[dev]";

const projectsRoot = path.resolve(__dirname, "..");

function log(msg) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

function waitForBackend(url, timeoutMs = 20000, interval = 500) {
  const end = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > end) {
          reject(new Error(`Backend not ready after ${timeoutMs}ms at ${url}`));
        } else {
          setTimeout(check, interval);
        }
      });
      req.setTimeout(interval, () => req.destroy());
    };
    check();
  });
}

function spawnProc(cmd, args, name) {
  log(`starting ${name}: ${cmd} ${args.join(" ")}`);
  const child = spawn(cmd, args, {
    cwd: projectsRoot,
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code, signal) => {
    log(`${name} exited with code=${code} signal=${signal || ""}`);
  });
  return child;
}

async function main() {
  const backendFairness = spawnProc("python3", ["-u", "fed4fed/server.py"], "backend-fairness");
  const backendD3em = spawnProc("python3", ["-u", "d3em/backend/server.py"], "backend-d3em");
  try {
    await Promise.all([waitForBackend(FAIRNESS_BACKEND_URL), waitForBackend(D3EM_BACKEND_URL)]);
    log(`backends ready at ${FAIRNESS_BACKEND_URL} and ${D3EM_BACKEND_URL}`);
  } catch (err) {
    log(err.message);
  }

  const frontend = spawnProc(FRONT_CMD, ["run", "dev:frontend"], "frontend");

  const shutdown = () => {
    log("stopping dev processes...");
    if (frontend && !frontend.killed) frontend.kill("SIGTERM");
    if (backendFairness && !backendFairness.killed) backendFairness.kill("SIGTERM");
    if (backendD3em && !backendD3em.killed) backendD3em.kill("SIGTERM");
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Ensure logs folder exists for double-click scripts
const logsDir = path.join(projectsRoot, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

main();
