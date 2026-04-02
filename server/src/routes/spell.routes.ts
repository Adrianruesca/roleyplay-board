import { Router } from "express";
import Spell from "../models/Spell.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const {
      campaignId,
      name,
      learningCourse,
      learningMethod,
      school,
      type,
      duelType,
      tag,
    } = req.query;

    const filters: any = {};

    if (campaignId) filters.campaignId = campaignId;
    if (name) filters.name = { $regex: String(name), $options: "i" };
    if (learningCourse) filters.learningCourse = Number(learningCourse);
    if (learningMethod) filters.learningMethod = String(learningMethod);
    if (school) filters.school = String(school);
    if (type) filters.type = String(type);
    if (duelType) filters.duelType = String(duelType);
    if (tag) filters.tags = String(tag);

    const spells = await Spell.find(filters).sort({ name: 1 });

    res.json(spells);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const spell = await Spell.findById(req.params.id);

    if (!spell) {
      return res.status(404).json({ error: "Hechizo no encontrado" });
    }

    res.json(spell);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const spell = new Spell(req.body);
    const savedSpell = await spell.save();

    res.status(201).json(savedSpell);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const spell = await Spell.findById(req.params.id);

    if (!spell) {
      return res.status(404).json({ error: "Hechizo no encontrado" });
    }

    Object.assign(spell, req.body);
    const updatedSpell = await spell.save();

    res.json(updatedSpell);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const spell = await Spell.findByIdAndDelete(req.params.id);

    if (!spell) {
      return res.status(404).json({ error: "Hechizo no encontrado" });
    }

    res.json({ message: "Hechizo eliminado correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;