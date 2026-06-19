import http.server
import socketserver
import sys

PORT = 8000

class SafeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS headers for development flexibility
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

# Explicitly override the MIME type mappings to bypass Windows registry bugs
# This fixes the "Failed to load module script... MIME type of 'text/plain'" error.
SafeHTTPRequestHandler.extensions_map.update({
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.html': 'text/html',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
})

def main():
    # Allow port selection from command line
    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass

    # Avoid socket in-use crashes on quick restarts
    socketserver.TCPServer.allow_reuse_address = True

    try:
        with socketserver.TCPServer(("", port), SafeHTTPRequestHandler) as httpd:
            print(f"==================================================")
            print(f"PriorityTask Development Server Started!")
            print(f"Local URL: http://localhost:{port}")
            print(f"==================================================")
            print("Press Ctrl+C to stop the server.")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
