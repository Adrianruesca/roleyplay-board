import { Router } from "express";
import Campaign from "../models/Campaign.js";

/* console.log("campaign.routes loaded"); */

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
  /* console.log("GET /api/campaigns hit"); */
});

router.get("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ error: "Campaña no encontrada" });
    }

    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;