import type { Express, Request, Response } from "express";
import express from "express";
import path from "path";
import fs from "fs";
import multer, { type FileFilterCallback } from "multer";

const PUBLIC_URL = process.env.PUBLIC_URL || "";

export const makePublicUrl = (p: string, req: Request) => {
  const base = PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  return `${base}${p.startsWith("/") ? "" : "/"}${p}`;
};

export const uploadDir = path.resolve("uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const registerUploadsStatic = (app: Express) => {
  app.use(
    "/uploads",
    express.static(uploadDir, {
      maxAge: "1d",
      setHeaders: (res: Response) => {
        res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_ORIGIN || "*");
      },
    })
  );
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const ok = /^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error("Formato no permitido: solo imágenes"));
};

const audioFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const ok = /^audio\//i.test(file.mimetype);
  if (ok) cb(null, true);
  else cb(new Error("Formato no permitido: solo audio"));
};

export const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadAudio = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});