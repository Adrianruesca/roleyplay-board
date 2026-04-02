import { Router } from "express";
import Note from "../models/Notes.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campaignId, title, category, author, tag } = req.query;

    const filters: any = {};

    if (campaignId) filters.campaignId = campaignId;
    if (title) filters.title = { $regex: String(title), $options: "i" };
    if (category) filters.category = String(category);
    if (author) filters.author = { $regex: String(author), $options: "i" };
    if (tag) filters.tags = String(tag);

    const notes = await Note.find(filters).sort({ createdAt: -1 });

    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ error: "Nota no encontrada" });
    }

    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const note = new Note(req.body);
    const savedNote = await note.save();

    res.status(201).json(savedNote);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ error: "Nota no encontrada" });
    }

    Object.assign(note, req.body);
    const updatedNote = await note.save();

    res.json(updatedNote);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const note = await Note.findByIdAndDelete(req.params.id);

    if (!note) {
      return res.status(404).json({ error: "Nota no encontrada" });
    }

    res.json({ message: "Nota eliminada correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;