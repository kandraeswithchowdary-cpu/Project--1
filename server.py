"""HTTP backend for the scientific calculator."""

from __future__ import annotations

import argparse
import json
import mimetypes
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from calculator import CalculatorError, ScientificCalculator


calculator = ScientificCalculator()
BASE_DIR = Path(__file__).resolve().parent
STATIC_ROUTES = {
    "/": BASE_DIR / "index.html",
    "/index.html": BASE_DIR / "index.html",
    "/styles.css": BASE_DIR / "styles.css",
    "/app.js": BASE_DIR / "app.js",
}


class CalculatorRequestHandler(BaseHTTPRequestHandler):
    server_version = "ScientificCalculator/1.0"

    def do_GET(self) -> None:
        path = urlparse(self.path).path

        if path in STATIC_ROUTES:
            self._send_file(STATIC_ROUTES[path])
            return

        if path == "/health":
            self._send_json({"status": "ok"})
            return

        if path == "/functions":
            self._send_json(
                {
                    "functions": calculator.available_functions(),
                    "constants": calculator.available_constants(),
                    "angle_modes": ["rad", "deg"],
                }
            )
            return

        self._send_json({"error": "Not found."}, status=404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/calculate":
            self._send_json({"error": "Not found."}, status=404)
            return

        try:
            payload = self._read_json()
            expression = payload.get("expression")
            angle_mode = payload.get("angle_mode")
            evaluation = calculator.evaluate(expression, angle_mode=angle_mode)
            self._send_json(
                {
                    "expression": evaluation.expression,
                    "result": evaluation.result,
                    "angle_mode": evaluation.angle_mode,
                }
            )
        except CalculatorError as exc:
            self._send_json({"error": str(exc)}, status=400)
        except json.JSONDecodeError:
            self._send_json({"error": "Request body must be valid JSON."}, status=400)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _read_json(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length <= 0:
            raise CalculatorError("Request body is required.")

        raw_body = self.rfile.read(content_length).decode("utf-8")
        payload = json.loads(raw_body)
        if not isinstance(payload, dict):
            raise CalculatorError("Request body must be a JSON object.")
        return payload

    def _send_json(self, data: dict[str, Any], status: int = 200) -> None:
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path) -> None:
        if not path.exists() or not path.is_file():
            self._send_json({"error": "File not found."}, status=404)
            return

        body = path.read_bytes()
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run(host: str = "127.0.0.1", port: int = 8000) -> None:
    server = ThreadingHTTPServer((host, port), CalculatorRequestHandler)
    print(f"Scientific calculator backend running at http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down calculator backend.")
    finally:
        server.server_close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the scientific calculator backend.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind.")
    parser.add_argument("--port", default=8000, type=int, help="Port to bind.")
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    run(host=arguments.host, port=arguments.port)
