import { Router } from "express";
import Item from "../models/Item.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campaignId, name, type, tag } = req.query;

    const filters: any = {};

    if (campaignId) filters.campaignId = campaignId;
    if (name) filters.name = { $regex: String(name), $options: "i" };
    if (type) filters.type = String(type);
    if (tag) filters.tags = String(tag);

    const items = await Item.find(filters).sort({ name: 1 });

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Objeto no encontrado" });
    }

    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const item = new Item(req.body);
    const savedItem = await item.save();

    res.status(201).json(savedItem);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Objeto no encontrado" });
    }

    Object.assign(item, req.body);
    const updatedItem = await item.save();

    res.json(updatedItem);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);

    if (!item) {
      return res.status(404).json({ error: "Objeto no encontrado" });
    }

    res.json({ message: "Objeto eliminado correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;