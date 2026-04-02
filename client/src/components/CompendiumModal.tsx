import { useEffect, useState } from "react";
import NPCSection from "./compendium/NPCSection";
import JournalSection from "./compendium/JournalSection";
import SpellSection from "./compendium/SpellSection";
import LocationSection from "./compendium/LocationSection";
import ItemSection from "./compendium/ItemSection";
import NoteSection from "./compendium/NoteSection";

type CompendiumSection =
  | "npcs"
  | "journal"
  | "spells"
  | "notes"
  | "locations"
  | "items";

type CompendiumModalProps = {
  open: boolean;
  onClose: () => void;
};

type Campaign = {
  _id: string;
  slug: string;
  code: string;
  name: string;
  description: string;
};

const sectionLabels: Record<CompendiumSection, string> = {
  npcs: "NPCs",
  journal: "Diario",
  spells: "Hechizos",
  notes: "Notas",
  locations: "Localizaciones",
  items: "Objetos",
};

export default function CompendiumModal({
  open,
  onClose,
}: CompendiumModalProps) {
  const [activeSection, setActiveSection] = useState<CompendiumSection>("npcs");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState("");

  useEffect(() => {
    if (!open) return;

    const loadCampaigns = async () => {
      try {
        setCampaignsLoading(true);
        setCampaignsError("");

        const res = await fetch("/api/campaigns");
        if (!res.ok) {
          throw new Error("No se pudieron cargar las campañas");
        }

        const data = await res.json();
        setCampaigns(data);

        if (data.length > 0 && !selectedCampaignId) {
          setSelectedCampaignId(data[0]._id);
        }
      } catch (err: any) {
        setCampaignsError(err.message || "Error cargando campañas");
      } finally {
        setCampaignsLoading(false);
      }
    };

    loadCampaigns();
  }, [open, selectedCampaignId]);

  if (!open) return null;

  const sectionComponents: Record<CompendiumSection, React.ReactNode> = {
    npcs: <NPCSection campaignId={selectedCampaignId} />,
    journal: <JournalSection campaignId={selectedCampaignId} />,
    spells: <SpellSection campaignId={selectedCampaignId} />,
    notes: <NoteSection campaignId={selectedCampaignId} />,
    locations: <LocationSection campaignId={selectedCampaignId} />,
    items: <ItemSection campaignId={selectedCampaignId} />,
  };

  return (
    <div className="compendium-overlay" onClick={onClose}>
      <div className="compendium-modal" onClick={(e) => e.stopPropagation()}>
        <div className="compendium-header">
          <div>
            <h2>Compendio</h2>
            <p>Base de datos de la campaña</p>
          </div>

          <button className="compendium-close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="compendium-body">
          <aside className="compendium-sidebar">
            {(Object.keys(sectionLabels) as CompendiumSection[]).map((section) => (
              <button
                key={section}
                className={`compendium-tab ${
                  activeSection === section ? "active" : ""
                }`}
                onClick={() => setActiveSection(section)}
              >
                {sectionLabels[section]}
              </button>
            ))}
          </aside>

          <main className="compendium-content">
            <div className="compendium-toolbar">
              <div className="compendium-toolbar-row">
                <input
                  className="compendium-search"
                  type="text"
                  placeholder={`Buscar en ${sectionLabels[activeSection].toLowerCase()}...`}
                  disabled
                />

                <select
                  className="compendium-select"
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  disabled={campaignsLoading || campaigns.length === 0}
                >
                  <option value="">
                    {campaignsLoading
                      ? "Cargando campañas..."
                      : "Selecciona una campaña"}
                  </option>

                  {campaigns.map((campaign) => (
                    <option key={campaign._id} value={campaign._id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              {campaignsError ? (
                <p className="compendium-inline-error">{campaignsError}</p>
              ) : null}
            </div>

            <div className="compendium-panel">
              <h3>{sectionLabels[activeSection]}</h3>
              {sectionComponents[activeSection]}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}