import { Router } from "express";
import type { Server } from "socket.io";
import { makePublicUrl, uploadAudio, uploadImage } from "../config/uploads.js";

const tableRoom = (tableId: string) => `table:${tableId}`;

export const createUploadRouter = (io: Server) => {
  const router = Router();

  router.post("/upload", uploadImage.single("image"), (req, res) => {
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

  router.post("/upload-audio", uploadAudio.single("audio"), (req, res) => {
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

  return router;
};