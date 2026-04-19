"""
Local server for Godot Web Export
Serves files with the required COOP/COEP headers for SharedArrayBuffer / WASM threading.
Run: python serve.py
Then open: http://localhost:8060/hotel_fire_simulation.html
"""

import http.server
import socketserver
import os

PORT = 8060
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Required for SharedArrayBuffer / Atomics used by Godot WASM
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        # Allow embedding in dashboard iframe
        self.send_header("Access-Control-Allow-Origin", "*")
        # Disable caching during development
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        print(f"  {self.address_string()} - {format % args}")


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        httpd.allow_reuse_address = True
        print(f"=== Godot Simulation Server ===")
        print(f"Serving: {DIRECTORY}")
        print(f"Open:    http://localhost:{PORT}/hotel_fire_simulation.html")
        print(f"Press Ctrl+C to stop.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
