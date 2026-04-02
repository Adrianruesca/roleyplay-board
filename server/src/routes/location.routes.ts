import { Router } from "express";
import Location from "../models/Location.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { campaignId, name, type, parentLocationId, tag } = req.query;

    const filters: any = {};

    if (campaignId) filters.campaignId = campaignId;
    if (name) filters.name = { $regex: String(name), $options: "i" };
    if (type) filters.type = String(type);
    if (parentLocationId) filters.parentLocationId = parentLocationId;
    if (tag) filters.tags = String(tag);

    const locations = await Location.find(filters).sort({ name: 1 });

    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({ error: "Localización no encontrada" });
    }

    res.json(location);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const location = new Location(req.body);
    const savedLocation = await location.save();

    res.status(201).json(savedLocation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({ error: "Localización no encontrada" });
    }

    Object.assign(location, req.body);
    const updatedLocation = await location.save();

    res.json(updatedLocation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);

    if (!location) {
      return res.status(404).json({ error: "Localización no encontrada" });
    }

    res.json({ message: "Localización eliminada correctamente" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;