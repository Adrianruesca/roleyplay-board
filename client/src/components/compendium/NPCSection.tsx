import { useEffect, useMemo, useState } from "react";

type NPC = {
  _id: string;
  campaignId: string;
  image?: string;
  name: string;
  course: number;
  house: string;
  faction: string;
  status: string;
  description: string;
  history: string;
  tags?: string[];
};

type NPCSectionProps = {
  campaignId: string;
};

type NPCFormState = {
  image: string;
  name: string;
  course: string;
  house: string;
  faction: string;
  status: string;
  description: string;
  history: string;
  tags: string;
};

const emptyForm: NPCFormState = {
  image: "",
  name: "",
  course: "",
  house: "",
  faction: "",
  status: "active",
  description: "",
  history: "",
  tags: "",
};

export default function NPCSection({ campaignId }: NPCSectionProps) {
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [houseFilter, setHouseFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [selectedNpc, setSelectedNpc] = useState<NPC | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingNpcId, setEditingNpcId] = useState<string | null>(null);
  const [form, setForm] = useState<NPCFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadNPCs = async () => {
    if (!campaignId) {
      setNpcs([]);
      setSelectedNpc(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/npcs?campaignId=${encodeURIComponent(campaignId)}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar los NPCs");
      }

      const data = await res.json();
      setNpcs(data);
      setSelectedNpc((current: NPC | null) => {
        if (current && data.some((npc: NPC) => npc._id === current._id)) {
          return current;
        }
        return data[0] ?? null;
      });
    } catch (err: any) {
      setError(err.message || "Error cargando NPCs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNPCs();
  }, [campaignId]);

  const houses = useMemo(() => {
    return [...new Set(npcs.map((npc) => npc.house).filter(Boolean))].sort();
  }, [npcs]);

  const courses = useMemo(() => {
    return [...new Set(npcs.map((npc) => npc.course).filter(Boolean))].sort((a, b) => a - b);
  }, [npcs]);

  const filteredNpcs = useMemo(() => {
    return npcs.filter((npc) => {
      const matchesSearch =
        !search ||
        npc.name.toLowerCase().includes(search.toLowerCase()) ||
        npc.description.toLowerCase().includes(search.toLowerCase());

      const matchesHouse = !houseFilter || npc.house === houseFilter;
      const matchesCourse = !courseFilter || npc.course === Number(courseFilter);

      return matchesSearch && matchesHouse && matchesCourse;
    });
  }, [npcs, search, houseFilter, courseFilter]);

  useEffect(() => {
    if (!selectedNpc && filteredNpcs.length > 0) {
      setSelectedNpc(filteredNpcs[0]);
      return;
    }

    if (
      selectedNpc &&
      !filteredNpcs.some((npc) => npc._id === selectedNpc._id)
    ) {
      setSelectedNpc(filteredNpcs[0] ?? null);
    }
  }, [filteredNpcs, selectedNpc]);

  const startCreate = () => {
    if (!campaignId) return;
    setIsEditing(true);
    setEditingNpcId(null);
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selectedNpc) return;

    setIsEditing(true);
    setEditingNpcId(selectedNpc._id);
    setForm({
      image: selectedNpc.image || "",
      name: selectedNpc.name || "",
      course: String(selectedNpc.course || ""),
      house: selectedNpc.house || "",
      faction: selectedNpc.faction || "",
      status: selectedNpc.status || "active",
      description: selectedNpc.description || "",
      history: selectedNpc.history || "",
      tags: selectedNpc.tags?.join(", ") || "",
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingNpcId(null);
    setForm(emptyForm);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (!campaignId) {
        setError("Debes seleccionar una campaña");
        return;
      }

      if (!form.name.trim()) {
        setError("El nombre es obligatorio");
        return;
      }

      if (!form.course || Number.isNaN(Number(form.course))) {
        setError("El curso es obligatorio");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        campaignId,
        image: form.image.trim(),
        name: form.name.trim(),
        course: Number(form.course),
        house: form.house.trim(),
        faction: form.faction.trim(),
        status: form.status.trim(),
        description: form.description.trim(),
        history: form.history.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const isEdit = Boolean(editingNpcId);
      const url = isEdit ? `/api/npcs/${editingNpcId}` : "/api/npcs";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "No se pudo guardar el NPC");
      }

      await loadNPCs();
      setSelectedNpc(data);
      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Error guardando NPC");
    } finally {
      setSaving(false);
    }
  };

  if (!campaignId) {
    return <p>Selecciona una campaña para ver sus NPCs.</p>;
  }

  if (loading) return <p>Cargando NPCs...</p>;
  if (error && !isEditing) return <p>{error}</p>;

  return (
    <div className="npc-section">
      <div className="npc-filters">
        <input
          className="compendium-search"
          type="text"
          placeholder="Buscar NPC por nombre o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="compendium-select"
          value={houseFilter}
          onChange={(e) => setHouseFilter(e.target.value)}
        >
          <option value="">Todas las casas</option>
          {houses.map((house) => (
            <option key={house} value={house}>
              {house}
            </option>
          ))}
        </select>

        <select
          className="compendium-select"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="">Todos los cursos</option>
          {courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>

        <button className="compendium-action-button" onClick={startCreate}>
          Nuevo NPC
        </button>

        <button
          className="compendium-action-button"
          onClick={startEdit}
          disabled={!selectedNpc}
        >
          Editar NPC
        </button>
      </div>

      <div className="npc-layout">
        <div className="npc-list">
          {filteredNpcs.length === 0 ? (
            <p>No hay NPCs que coincidan con los filtros.</p>
          ) : (
            filteredNpcs.map((npc) => (
              <button
                key={npc._id}
                className={`npc-list-item ${selectedNpc?._id === npc._id ? "active" : ""}`}
                onClick={() => setSelectedNpc(npc)}
              >
                <strong>{npc.name}</strong>
                <span>
                  {npc.course}º · {npc.house || "Sin casa"}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="npc-detail">
          {isEditing ? (
            <div className="npc-form">
              <h4>{editingNpcId ? "Editar NPC" : "Nuevo NPC"}</h4>

              {error ? <p>{error}</p> : null}

              <input
                className="compendium-input"
                name="image"
                placeholder="URL de imagen"
                value={form.image}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="name"
                placeholder="Nombre"
                value={form.name}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="course"
                type="number"
                placeholder="Curso"
                value={form.course}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="house"
                placeholder="Casa"
                value={form.house}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="faction"
                placeholder="Facción"
                value={form.faction}
                onChange={handleChange}
              />

              <select
                className="compendium-select"
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="missing">missing</option>
                <option value="dead">dead</option>
              </select>

              <textarea
                className="compendium-textarea"
                name="description"
                placeholder="Descripción"
                value={form.description}
                onChange={handleChange}
              />

              <textarea
                className="compendium-textarea"
                name="history"
                placeholder="Historia"
                value={form.history}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="tags"
                placeholder="Tags separadas por comas"
                value={form.tags}
                onChange={handleChange}
              />

              <div className="compendium-form-actions">
                <button
                  className="compendium-action-button"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>

                <button
                  className="compendium-action-button secondary"
                  onClick={cancelEdit}
                  disabled={saving}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : selectedNpc ? (
            <>
              <h4>{selectedNpc.name}</h4>
              <p>
                <strong>Curso:</strong> {selectedNpc.course}
              </p>
              <p>
                <strong>Casa:</strong> {selectedNpc.house || "—"}
              </p>
              <p>
                <strong>Facción:</strong> {selectedNpc.faction || "—"}
              </p>
              <p>
                <strong>Estado:</strong> {selectedNpc.status || "—"}
              </p>
              <p>
                <strong>Descripción:</strong> {selectedNpc.description || "—"}
              </p>
              <p>
                <strong>Historia:</strong> {selectedNpc.history || "—"}
              </p>

              {selectedNpc.tags?.length ? (
                <div className="compendium-tags">
                  {selectedNpc.tags.map((tag) => (
                    <span key={tag} className="compendium-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>Selecciona un NPC para ver sus detalles.</p>
          )}
        </div>
      </div>
    </div>
  );
}