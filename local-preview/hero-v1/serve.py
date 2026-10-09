from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class HeroPreviewHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".woff2": "font/woff2",
    }


if __name__ == "__main__":
    repository_root = Path(__file__).resolve().parents[2]
    server = ThreadingHTTPServer(
        ("127.0.0.1", 8000),
        lambda *args, **kwargs: HeroPreviewHandler(
            *args, directory=str(repository_root), **kwargs
        ),
    )
    print("Manz Skin Hero V2: http://localhost:8000/local-preview/hero-v1/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
