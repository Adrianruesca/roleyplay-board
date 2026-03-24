import Campaign from "../models/Campaign.js";

export async function ensureDefaultCampaign() {
  const slug = "guardianes-sello";

  const exists = await Campaign.findOne({ slug });

  if (!exists) {
    await Campaign.create({
      slug,
      code: "GUS-01",
      name: "Guardianes del Último Sello",
      description: "Campaña ambientada en Hogwarts 1985-86 donde los personajes se enfrentan a la misma muerte."
    });
    console.log("✔ Campaña inicial creada");
  } else {
    console.log("✔ Campaña ya existía");
  }
}
