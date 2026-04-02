import { Router } from "express";
import NPC from "../models/Npc.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campaignId, name, course, house, faction, status, tag } = req.query;

    const filters: any = {};

    if (campaignId) filters.campaignId = campaignId;
    if (name) filters.name = { $regex: String(name), $options: "i" };
    if (course) filters.course = Number(course);
    if (house) filters.house = house;
    if (faction) filters.faction = faction;
    if (status) filters.status = status;
    if (tag) filters.tags = String(tag);

    const npcs = await NPC.find(filters).sort({ name: 1 });
    res.json(npcs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const npc = await NPC.findById(req.params.id);

    if (!npc) {
      return res.status(404).json({ error: "NPC no encontrado" });
    }

    res.json(npc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const npc = new NPC(req.body);
    const savedNPC = await npc.save();
    res.status(201).json(savedNPC);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const npc = await NPC.findById(req.params.id);

    if (!npc) {
      return res.status(404).json({ error: "NPC no encontrado" });
    }

    Object.assign(npc, req.body);
    const updatedNPC = await npc.save();

    res.json(updatedNPC);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const npc = await NPC.findByIdAndDelete(req.params.id);

    if (!npc) {
      return res.status(404).json({ error: "NPC no encontrado" });
    }

    res.json({ message: "NPC eliminado correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;