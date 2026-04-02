import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { connectDB } from "./db.js";
import { ensureDefaultCampaign } from "./utils/ensureDefaultCampaign.js";
import { registerUploadsStatic } from "./config/uploads.js";

import { createUploadRouter } from "./routes/upload.routes.js";
import npcRoutes from "./routes/npc.routes.js";
import journalRoutes from "./routes/journal.routes.js";
import spellRoutes from "./routes/spell.routes.js";
import noteRoutes from "./routes/note.routes.js";
import locationRoutes from "./routes/location.routes.js";
import itemRoutes from "./routes/item.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";

import { registerSocketHandlers } from "./socket/registerSocketHandlers.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

registerUploadsStatic(app);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// --- routes ---
/* app.get("/api/test-route", (_req, res) => {
  res.json({ ok: true });
});
app.get("/api/campaigns-inline", async (_req, res) => {
  res.json({ ok: true, where: "index" });
}); */
app.use("/api", createUploadRouter(io));
app.use("/api/npcs", npcRoutes);
app.use("/api/journal", journalRoutes);
app.use("/api/spells", spellRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/campaigns", campaignRoutes);

// --- conexión MongoDB ---
const MONGO_URI = process.env.MONGO_URI || "";
await connectDB(MONGO_URI);
await ensureDefaultCampaign();

// --- sockets ---
registerSocketHandlers(io);

// === compilado ===
const clientDist = path.resolve("../client/dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => {
  console.log(`✅ Server escuchando en http://localhost:${PORT}`);
});