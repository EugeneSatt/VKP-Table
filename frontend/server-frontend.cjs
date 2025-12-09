// server-frontend.cjs
const http = require("http");
const next = require("next");

const port = process.env.PORT || 3001;
const dev = false; // прод-режим
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      handle(req, res);
    });

    server.listen(port, (err) => {
      if (err) {
        console.error("Server error:", err);
        process.exit(1);
      }
      console.log(`✅ Frontend running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("Error during Next prepare:", err);
    process.exit(1);
  });
