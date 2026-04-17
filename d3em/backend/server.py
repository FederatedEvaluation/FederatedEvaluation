#!/usr/bin/env python3
"""D3EM backend server (standalone)."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Tuple

from compute import compute_d3em


class D3emHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status: int = 200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_POST(self):
        if self.path != "/api/d3em/evaluate":
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))
            return
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(body.decode("utf-8"))
            response = compute_d3em(payload)
            self._set_headers(200)
            self.wfile.write(json.dumps(response).encode("utf-8"))
        except Exception as exc:  # pylint: disable=broad-except
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))


def run_server(host: str = "0.0.0.0", port: int = 8010):
    with HTTPServer((host, port), D3emHandler) as httpd:
        print(f"D3EM server listening on http://{host}:{port}")
        httpd.serve_forever()


if __name__ == "__main__":
    run_server()
