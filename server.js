const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.argv[2] || process.env.PORT || 5188);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".mp4": "video/mp4",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const requested = cleanPath ? path.join(root, cleanPath) : path.join(root, "index.html");
  const resolved = path.resolve(requested);

  if (!resolved.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(resolved, (statError, stat) => {
    const filePath = !statError && stat.isDirectory() ? path.join(resolved, "index.html") : resolved;

    const contentType = types[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;

    if (range && contentType.startsWith("video/")) {
      fs.stat(filePath, (fileError, fileStat) => {
        if (fileError) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const fileSize = fileStat.size;
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize) {
          res.writeHead(416, { "Content-Range": `bytes */${fileSize}` });
          res.end();
          return;
        }

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Content-Type": contentType,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      });
      return;
    }

    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": data.length,
        "Accept-Ranges": contentType.startsWith("video/") ? "bytes" : "none",
      });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Crepey thighs sales page running at http://localhost:${port}`);
});
