import express, { type Request } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import multer, { type FileFilterCallback } from "multer";
import { connectDB } from "./db.js";
import Message from "./models/Message.js";
import Roll from "./models/Roll.js";
import Duel from "./models/Duel.js";
import { ensureDefaultCampaign } from "./utils/ensureDefaultCampaign.js";

dotenv.config();
const PUBLIC_URL = process.env.PUBLIC_URL || "";
const makePublicUrl = (p: string, req: Request) => {
  const base = PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}${p.startsWith("/") ? "" : "/"}${p}`;
};

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

/* === uploads estáticos === */
const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(
  "/uploads",
  express.static(uploadDir, {
    maxAge: "1d",
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_ORIGIN || "*");
    },
  })
);

/* === Configuración de multer === */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

// 🔹 Filtro solo para IMÁGENES
const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ok = /^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error("Formato no permitido: solo imágenes"));
};

// 🔹 Filtro para AUDIO
const audioFileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const ok = /^audio\//i.test(file.mimetype); // permite cualquier audio/*
  if (ok) cb(null, true);
  else cb(new Error("Formato no permitido: solo audio"));
};

// Multer para imágenes
const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB imágenes
});

// Multer para audio
const uploadAudio = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB audio
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

// --- conexión MongoDB ---
const MONGO_URI = process.env.MONGO_URI || "";
await connectDB(MONGO_URI);
await ensureDefaultCampaign();

// --- Estado en memoria ---
type Client = { id: string; name: string; tableId: string };
const clients = new Map<string, Client>();

// ❗ Helper para nombre de sala de mesa (sin llamar "room" para evitar conflictos)
const tableRoom = (tableId: string) => `table:${tableId}`;

// --- Sistema de duelos ---
type Move = "Ataque" | "Defensa" | "Especial" | "Legendario";

function resolveDuel(move1: Move, move2: Move): 0 | 1 | 2 {
  if (move1 === move2) return 0;
  if (move1 === "Legendario") return 1;
  if (move2 === "Legendario") return 2;
  const beats: Record<Move, Move> = {
    Ataque: "Especial",
    Especial: "Defensa",
    Defensa: "Ataque",
    Legendario: "Legendario",
  };
  return beats[move1] === move2 ? 1 : 2;
}

const duelStates = new Map<string, Record<string, Move>>();
const clientDuelRoom = new Map<string, string>();
const busyClients = new Set<string>();

/* === API: subir imagen === */
app.post("/api/upload", uploadImage.single("image"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const relPath = `/uploads/${req.file.filename}`;
    const absUrl = makePublicUrl(relPath, req);

    const { tableId, by } = (req.body || {}) as { tableId?: string; by?: string };
    if (tableId) io.to(tableRoom(tableId)).emit("board:update", { url: relPath, by });

    res.json({ url: relPath, absUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* === API: subir audio === */
app.post("/api/upload-audio", uploadAudio.single("audio"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });

    const relPath = `/uploads/${req.file.filename}`;
    const absUrl = makePublicUrl(relPath, req);

    const { tableId, by } = req.body || {};
    if (tableId) io.to(tableRoom(tableId)).emit("audio:load", { url: relPath, by });

    res.json({
      url: relPath,
      absUrl,
      filename: req.file.originalname,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

io.on("connection", (socket) => {
  // --- Unirse a mesa ---
  socket.on("table:join", async ({ tableId, name }: { tableId: string; name: string }) => {
    const client: Client = { id: socket.id, name, tableId };
    clients.set(socket.id, client);
    socket.join(tableRoom(tableId));

    const history = await Message.find({ tableId }).sort({ ts: 1 }).limit(50);
    const rolls = await Roll.find({ tableId }).sort({ ts: -1 }).limit(20);
    socket.emit("history", { messages: history, rolls });

    io.to(tableRoom(tableId)).emit(
      "table:users",
      Array.from(clients.values()).filter((c) => c.tableId === tableId)
    );
    socket.emit("system", { type: "welcome", message: `¡Bienvenido, ${name}!` });
  });

  // --- Chat ---
  socket.on(
    "chat:send",
    async ({ tableId, name, text }: { tableId: string; name: string; text: string }) => {
      const msg = new Message({ tableId, name, text });
      await msg.save();
      io.to(tableRoom(tableId)).emit("chat:new", msg);
    }
  );

  socket.on("chat:clear", async ({ tableId }: { tableId: string }) => {
    try {
      await Message.deleteMany({ tableId });
      await Roll.deleteMany({ tableId });
      io.to(tableRoom(tableId)).emit("chat:cleared");
      console.log(`🧹 Chat limpiado para la mesa ${tableId}`);
    } catch (err) {
      console.error("Error al limpiar chat:", err);
    }
  });

  // --- Dados ---
  socket.on(
    "dice:roll",
    async ({
      tableId,
      count,
      sides,
      mod,
    }: {
      tableId: string;
      count: number;
      sides: number;
      mod?: number;
    }) => {
      const allowedSides = [4, 6, 8, 10, 12, 20, 100];
      if (!allowedSides.includes(sides)) return;
      const safeCount = Math.max(1, Math.min(count, 100));
      const safeMod = Number(mod ?? 0);
      const rolls = Array.from(
        { length: safeCount },
        () => 1 + Math.floor(Math.random() * sides)
      );
      const total = rolls.reduce((a, b) => a + b, 0) + safeMod;

      const roll = new Roll({
        tableId,
        by: clients.get(socket.id)?.name ?? "anon",
        rolls,
        mod: safeMod,
        sides,
        total,
      });
      await roll.save();

      io.to(tableRoom(tableId)).emit("dice:result", roll);
    }
  );

  // --- Media (YouTube / imagen remota) ---
  socket.on(
    "board:setMedia",
    ({ tableId, url, by }: { tableId: string; url: string; by: string }) => {
      io.to(tableRoom(tableId)).emit("board:update", { url, by });
    }
  );

  // --- Sincronización YouTube (sin eco al emisor) ---
  socket.on("video:play", ({ tableId }) => {
    socket.to(tableRoom(tableId)).emit("video:play");
  });

  socket.on("video:pause", ({ tableId }) => {
    socket.to(tableRoom(tableId)).emit("video:pause");
  });

  socket.on("video:stop", ({ tableId }) => {
    socket.to(tableRoom(tableId)).emit("video:stop");
  });

  // --- Tokens ---
  socket.on("token:create", ({ tableId, id, x, y, img, size }) => {
    io.to(tableRoom(tableId)).emit("token:created", { id, x, y, img, size });
  });
  socket.on("token:move", ({ tableId, id, x, y }) =>
    io.to(tableRoom(tableId)).emit("token:moved", { id, x, y })
  );
  socket.on("token:delete", ({ tableId, id }) =>
    io.to(tableRoom(tableId)).emit("token:deleted", { id })
  );
  socket.on("token:clearAll", ({ tableId }) =>
    io.to(tableRoom(tableId)).emit("token:cleared")
  );
  socket.on("token:lock", ({ tableId, locked }) =>
    io.to(tableRoom(tableId)).emit("token:lockState", { locked })
  );

  // --- Audio ---
  socket.on("audio:load", ({ tableId, url, by }) =>
    io.to(tableRoom(tableId)).emit("audio:load", { url, by })
  );
  socket.on("audio:play", ({ tableId }) =>
    io.to(tableRoom(tableId)).emit("audio:play")
  );
  socket.on("audio:pause", ({ tableId }) =>
    io.to(tableRoom(tableId)).emit("audio:pause")
  );
  socket.on("audio:stop", ({ tableId }) =>
    io.to(tableRoom(tableId)).emit("audio:stop")
  );
  socket.on("audio:volume", ({ tableId, volume }) =>
    io.to(tableRoom(tableId)).emit("audio:volume", { volume })
  );

  // ====================== ⚔️ DUEL SYSTEM ======================

  socket.on("duel:request", ({ tableId, opponent }: { tableId: string; opponent: string }) => {
    const challenger = clients.get(socket.id);
    if (!challenger || busyClients.has(socket.id)) return;

    const target = Array.from(clients.values()).find(
      (c) => c.tableId === tableId && c.name === opponent
    );
    if (!target) return socket.emit("duel:cancelled", { by: "Sistema" });

    busyClients.add(socket.id);
    io.to(target.id).emit("duel:challenge", { from: challenger.name });
  });

  socket.on(
    "duel:accept",
    async ({ tableId, challenger }: { tableId: string; challenger: string }) => {
      const acceptor = clients.get(socket.id);
      if (!acceptor) return;

      const challengerSock = Array.from(clients.values()).find(
        (c) => c.tableId === tableId && c.name === challenger
      );
      if (!challengerSock) return;

      const duelRoomId = `duel:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      clientDuelRoom.set(acceptor.id, duelRoomId);
      clientDuelRoom.set(challengerSock.id, duelRoomId);
      busyClients.add(acceptor.id);
      busyClients.add(challengerSock.id);
      duelStates.set(duelRoomId, {});

      socket.join(duelRoomId);
      io.sockets.sockets.get(challengerSock.id)?.join(duelRoomId);

      io.to(duelRoomId).emit("duel:start", {
        room: duelRoomId,
        players: [challengerSock.name, acceptor.name],
      });

      // 💬 Log al chat: duelo iniciado
      try {
        const text = `Comienza un duelo entre ${challengerSock.name} y ${acceptor.name}.`;
        const msg = new Message({
          tableId,
          name: "⚔️ Duelo",
          text,
        });
        await msg.save();
        io.to(tableRoom(tableId)).emit("chat:new", msg);
      } catch (err) {
        console.error("❌ Error guardando mensaje de inicio de duelo:", err);
      }
    }
  );

  socket.on("duel:decline", ({ challenger }: { challenger: string }) => {
    const requester = Array.from(clients.values()).find((c) => c.name === challenger);
    if (requester) {
      io.to(requester.id).emit("duel:cancelled", {
        by: clients.get(socket.id)?.name ?? "oponente",
      });
      busyClients.delete(requester.id);
    }
  });

  socket.on("duel:cancel", () => {
    const client = clients.get(socket.id);
    if (!client) return;

    const duelRoomId = clientDuelRoom.get(client.id);
    if (!duelRoomId) return;

    io.to(duelRoomId).emit("duel:cancelled", { by: client.name });
    duelStates.delete(duelRoomId);
    for (const [cid, rid] of clientDuelRoom.entries()) {
      if (rid === duelRoomId) {
        clientDuelRoom.delete(cid);
        busyClients.delete(cid);
        io.sockets.sockets.get(cid)?.leave(duelRoomId);
      }
    }
  });

  socket.on(
    "duel:move",
    async ({
      room,
      tableId,
      player,
      move,
    }: {
      room: string;
      tableId: string;
      player: string;
      move: Move;
    }) => {
      const state = duelStates.get(room) ?? {};
      state[player] = move;
      duelStates.set(room, state);

      const players = Object.keys(state);
      if (players.length < 2) return;

      const [p1, p2] = players as [string, string];
      const m1 = state[p1] as Move;
      const m2 = state[p2] as Move;

      const outcome = resolveDuel(m1, m2);
      const winner = outcome === 0 ? "Empate" : outcome === 1 ? p1 : p2;

      io.to(room).emit("duel:result", {
        player1: p1,
        move1: m1,
        player2: p2,
        move2: m2,
        winner,
      });

      // Guardar resultado en MongoDB + log en chat
      try {
        await new Duel({
          tableId,
          player1: p1,
          player2: p2,
          move1: m1,
          move2: m2,
          winner,
        }).save();

        const resultText =
          winner === "Empate"
            ? `Duelo entre ${p1} (${m1}) y ${p2} (${m2}): EMPATE.`
            : `Duelo entre ${p1} (${m1}) y ${p2} (${m2}): gana ${winner}.`;

        const msg = new Message({
          tableId,
          name: "⚔️ Duelo",
          text: resultText,
        });
        await msg.save();
        io.to(tableRoom(tableId)).emit("chat:new", msg);
      } catch (err) {
        console.error("❌ Error guardando duelo o mensaje de duelo:", err);
      }

      duelStates.delete(room);
      for (const [cid, rid] of clientDuelRoom.entries()) {
        if (rid === room) {
          clientDuelRoom.delete(cid);
          busyClients.delete(cid);
          io.sockets.sockets.get(cid)?.leave(room);
        }
      }
    }
  );

  // ====================== FIN ⚔️ DUEL SYSTEM ======================

  // --- Desconexión ---
  socket.on("disconnect", () => {
    const client = clients.get(socket.id);
    if (client) {
      clients.delete(socket.id);
      io.to(tableRoom(client.tableId)).emit(
        "table:users",
        Array.from(clients.values()).filter((c) => c.tableId === client.tableId)
      );
    }

    const droom = clientDuelRoom.get(socket.id);
    if (droom) {
      io.to(droom).emit("duel:cancelled", {
        by: clients.get(socket.id)?.name || "Jugador",
      });
      duelStates.delete(droom);
      for (const [sid, r] of clientDuelRoom) {
        if (r === droom) {
          clientDuelRoom.delete(sid);
          busyClients.delete(sid);
          io.sockets.sockets.get(sid)?.leave(droom);
        }
      }
    }
  });
});

// === Servir el frontend compilado ===
const clientDist = path.resolve("../client/dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = Number(process.env.PORT || 3000);
server.listen(PORT, () => {
  console.log(`✅ Server escuchando en http://localhost:${PORT}`);
});
