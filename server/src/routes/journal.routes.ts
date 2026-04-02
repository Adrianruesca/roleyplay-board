import { Router } from "express";
import JournalEntry from "../models/JournalEntry.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campaignId, title, sessionNumber, tag } = req.query;

    const filters: any = {};

    if (campaignId) filters.campaignId = campaignId;
    if (title) filters.title = { $regex: String(title), $options: "i" };
    if (sessionNumber) filters.sessionNumber = Number(sessionNumber);
    if (tag) filters.tags = String(tag);

    const entries = await JournalEntry.find(filters).sort({
      sessionNumber: -1,
      date: -1,
    });

    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    res.json(entry);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const entry = new JournalEntry(req.body);
    const savedEntry = await entry.save();

    res.status(201).json(savedEntry);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    Object.assign(entry, req.body);
    const updatedEntry = await entry.save();

    res.json(updatedEntry);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const entry = await JournalEntry.findByIdAndDelete(req.params.id);

    if (!entry) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    res.json({ message: "Entrada eliminada correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;