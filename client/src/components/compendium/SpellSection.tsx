import { useEffect, useMemo, useState } from "react";

type Spell = {
  _id: string;
  campaignId: string;
  name: string;
  learningCourse?: number | null;
  learningMethod?: string;
  school: string;
  type:
    | "attack"
    | "defense"
    | "healing"
    | "control"
    | "support"
    | "utility"
    | "curse"
    | "transformation"
    | "summoning"
    | "ritual";
  duelType?: "attack" | "defense" | "special" | null;
  effect?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type SpellSectionProps = {
  campaignId: string;
};

type SpellFormState = {
  name: string;
  learningCourse: string;
  learningMethod: string;
  school: string;
  type: string;
  duelType: string;
  effect: string;
  tags: string;
};

const emptyForm: SpellFormState = {
  name: "",
  learningCourse: "",
  learningMethod: "",
  school: "",
  type: "",
  duelType: "",
  effect: "",
  tags: "",
};

const spellTypes = [
  "attack",
  "defense",
  "healing",
  "control",
  "support",
  "utility",
  "curse",
  "transformation",
  "summoning",
  "ritual",
];

const duelTypes = ["attack", "defense", "special"];

export default function SpellSection({ campaignId }: SpellSectionProps) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingSpellId, setEditingSpellId] = useState<string | null>(null);
  const [form, setForm] = useState<SpellFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadSpells = async () => {
    if (!campaignId) {
      setSpells([]);
      setSelectedSpell(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/spells?campaignId=${encodeURIComponent(campaignId)}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar los hechizos");
      }

      const data = await res.json();
      setSpells(data);

      setSelectedSpell((current: Spell | null) => {
        if (current && data.some((spell: Spell) => spell._id === current._id)) {
          return data.find((spell: Spell) => spell._id === current._id) ?? current;
        }
        return data[0] ?? null;
      });
    } catch (err: any) {
      setError(err.message || "Error cargando hechizos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpells();
  }, [campaignId]);

  const schools = useMemo(() => {
    return [...new Set(spells.map((spell) => spell.school).filter(Boolean))].sort();
  }, [spells]);

  const filteredSpells = useMemo(() => {
    return spells.filter((spell) => {
      const matchesSearch =
        !search ||
        spell.name.toLowerCase().includes(search.toLowerCase()) ||
        spell.school.toLowerCase().includes(search.toLowerCase()) ||
        (spell.effect || "").toLowerCase().includes(search.toLowerCase()) ||
        (spell.learningMethod || "").toLowerCase().includes(search.toLowerCase());

      const matchesSchool = !schoolFilter || spell.school === schoolFilter;
      const matchesType = !typeFilter || spell.type === typeFilter;

      return matchesSearch && matchesSchool && matchesType;
    });
  }, [spells, search, schoolFilter, typeFilter]);

  useEffect(() => {
    if (!selectedSpell && filteredSpells.length > 0) {
      setSelectedSpell(filteredSpells[0]);
      return;
    }

    if (
      selectedSpell &&
      !filteredSpells.some((spell) => spell._id === selectedSpell._id)
    ) {
      setSelectedSpell(filteredSpells[0] ?? null);
    }
  }, [filteredSpells, selectedSpell]);

  const startCreate = () => {
    if (!campaignId) return;
    setIsEditing(true);
    setEditingSpellId(null);
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selectedSpell) return;

    setIsEditing(true);
    setEditingSpellId(selectedSpell._id);
    setForm({
      name: selectedSpell.name || "",
      learningCourse:
        selectedSpell.learningCourse !== null &&
        selectedSpell.learningCourse !== undefined
          ? String(selectedSpell.learningCourse)
          : "",
      learningMethod: selectedSpell.learningMethod || "",
      school: selectedSpell.school || "",
      type: selectedSpell.type || "",
      duelType: selectedSpell.duelType || "",
      effect: selectedSpell.effect || "",
      tags: selectedSpell.tags?.join(", ") || "",
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingSpellId(null);
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

      if (!form.school.trim()) {
        setError("La escuela es obligatoria");
        return;
      }

      if (!form.type.trim()) {
        setError("El tipo es obligatorio");
        return;
      }

      if (!form.learningCourse.trim() && !form.learningMethod.trim()) {
        setError("Debes indicar al menos learningCourse o learningMethod");
        return;
      }

      if (form.learningCourse && Number.isNaN(Number(form.learningCourse))) {
        setError("El learningCourse debe ser un número válido");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        campaignId,
        name: form.name.trim(),
        learningCourse:
          form.learningCourse.trim() === "" ? undefined : Number(form.learningCourse),
        learningMethod: form.learningMethod.trim(),
        school: form.school.trim(),
        type: form.type,
        duelType: form.duelType.trim() === "" ? null : form.duelType,
        effect: form.effect.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const isEdit = Boolean(editingSpellId);
      const url = isEdit ? `/api/spells/${editingSpellId}` : "/api/spells";
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
        throw new Error(data?.error || "No se pudo guardar el hechizo");
      }

      await loadSpells();
      setSelectedSpell(data);
      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Error guardando hechizo");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("es-ES");
  };

  if (!campaignId) {
    return <p>Selecciona una campaña para ver sus hechizos.</p>;
  }

  if (loading) return <p>Cargando hechizos...</p>;
  if (error && !isEditing) return <p>{error}</p>;

  return (
    <div className="spell-section">
      <div className="npc-filters">
        <input
          className="compendium-search"
          type="text"
          placeholder="Buscar hechizo por nombre, escuela, efecto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="compendium-select"
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
        >
          <option value="">Todas las escuelas</option>
          {schools.map((school) => (
            <option key={school} value={school}>
              {school}
            </option>
          ))}
        </select>

        <select
          className="compendium-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {spellTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button className="compendium-action-button" onClick={startCreate}>
          Nuevo hechizo
        </button>

        <button
          className="compendium-action-button"
          onClick={startEdit}
          disabled={!selectedSpell}
        >
          Editar hechizo
        </button>
      </div>

      <div className="npc-layout">
        <div className="npc-list">
          {filteredSpells.length === 0 ? (
            <p>No hay hechizos que coincidan con los filtros.</p>
          ) : (
            filteredSpells.map((spell) => (
              <button
                key={spell._id}
                className={`npc-list-item ${selectedSpell?._id === spell._id ? "active" : ""}`}
                onClick={() => setSelectedSpell(spell)}
              >
                <strong>{spell.name}</strong>
                <span>
                  {spell.school || "Sin escuela"} · {spell.type}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="npc-detail">
          {isEditing ? (
            <div className="npc-form">
              <h4>{editingSpellId ? "Editar hechizo" : "Nuevo hechizo"}</h4>

              {error ? <p>{error}</p> : null}

              <input
                className="compendium-input"
                name="name"
                placeholder="Nombre"
                value={form.name}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="learningCourse"
                type="number"
                placeholder="Curso de aprendizaje"
                value={form.learningCourse}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="learningMethod"
                placeholder="Método de aprendizaje"
                value={form.learningMethod}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="school"
                placeholder="Escuela"
                value={form.school}
                onChange={handleChange}
              />

              <select
                className="compendium-select"
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option value="">Selecciona tipo</option>
                {spellTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                className="compendium-select"
                name="duelType"
                value={form.duelType}
                onChange={handleChange}
              >
                <option value="">Sin duelType</option>
                {duelTypes.map((duelType) => (
                  <option key={duelType} value={duelType}>
                    {duelType}
                  </option>
                ))}
              </select>

              <textarea
                className="compendium-textarea"
                name="effect"
                placeholder="Efecto"
                value={form.effect}
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
          ) : selectedSpell ? (
            <>
              <h4>{selectedSpell.name}</h4>

              <p>
                <strong>Escuela:</strong> {selectedSpell.school || "—"}
              </p>

              <p>
                <strong>Tipo:</strong> {selectedSpell.type || "—"}
              </p>

              <p>
                <strong>Duel Type:</strong> {selectedSpell.duelType || "—"}
              </p>

              <p>
                <strong>Curso de aprendizaje:</strong>{" "}
                {selectedSpell.learningCourse ?? "—"}
              </p>

              <p>
                <strong>Método de aprendizaje:</strong>{" "}
                {selectedSpell.learningMethod || "—"}
              </p>

              <p>
                <strong>Efecto:</strong> {selectedSpell.effect || "—"}
              </p>

              <p>
                <strong>Creado:</strong> {formatDate(selectedSpell.createdAt)}
              </p>

              <p>
                <strong>Última actualización:</strong>{" "}
                {formatDate(selectedSpell.updatedAt)}
              </p>

              {selectedSpell.tags?.length ? (
                <div className="compendium-tags">
                  {selectedSpell.tags.map((tag) => (
                    <span key={tag} className="compendium-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>Selecciona un hechizo para ver sus detalles.</p>
          )}
        </div>
      </div>
    </div>
  );
}