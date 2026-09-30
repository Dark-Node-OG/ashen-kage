# serve.py — local dev server that DISABLES caching so the browser always gets fresh files.
import http.server, socketserver

PORT = 8900

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a):
        pass

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), NoCache) as httpd:
    print(f'ASHEN KAGE dev server (no-cache) on http://127.0.0.1:{PORT}/')
    httpd.serve_forever()
