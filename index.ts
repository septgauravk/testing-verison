import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { getStoreUserFromRequest } from "../storeAuth";
import { storagePut } from "../storage";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.post("/api/store/media", express.raw({ type: req => /^(image|video)\//.test(req.headers["content-type"] || ""), limit: "150mb" }), async (req, res) => {
    const user = await getStoreUserFromRequest(req);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Owner access required" });
    const contentType = req.header("content-type") || "application/octet-stream";
    if (!Buffer.isBuffer(req.body) || !contentType.match(/^(image\/(jpeg|png|webp|avif)|video\/(mp4|webm|quicktime))$/)) {
      return res.status(400).json({ error: "Only optimized JPG, PNG, WebP, AVIF, MP4, WebM, or MOV files are supported" });
    }
    if (req.body.length === 0) return res.status(400).json({ error: "File is empty" });
    if (req.body.length > 150 * 1024 * 1024) return res.status(413).json({ error: "Media file is too large" });
    try {
      const fileName = String(req.header("x-file-name") || "media").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
      const result = await storagePut(`horologe/${user.id}/media/${fileName}`, req.body, contentType);
      return res.json(result);
    } catch (error) {
      console.error("[Storage] Media upload failed", error);
      return res.status(502).json({ error: "Media storage upload failed" });
    }
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
