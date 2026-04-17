#!/usr/bin/env node
const net = require("net");

const ports = [3000, 8000, 8010];

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.once("connect", () => {
      socket.destroy();
      resolve({ port, status: "busy" });
    });
    socket.once("error", () => {
      resolve({ port, status: "free" });
    });
    socket.connect(port, "127.0.0.1");
    setTimeout(() => {
      socket.destroy();
      resolve({ port, status: "unknown" });
    }, 1000);
  });
}

async function main() {
  const results = await Promise.all(ports.map(checkPort));
  results.forEach((r) => {
    if (r.status === "busy") {
      console.log(`Port ${r.port} is in use. If a previous dev server is running, stop it with "npm run dev:stop".`);
    } else if (r.status === "free") {
      console.log(`Port ${r.port} is free.`);
    } else {
      console.log(`Port ${r.port} status could not be determined.`);
    }
  });
}

main();
