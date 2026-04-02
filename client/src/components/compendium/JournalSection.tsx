import { useEffect, useMemo, useState } from "react";

type JournalEntry = {
  _id: string;
  campaignId: string;
  title: string;
  date?: string;
  sessionNumber?: number | null;
  events: string;
  updateBy?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type JournalSectionProps = {
  campaignId: string;
};

type JournalFormState = {
  title: string;
  date: string;
  sessionNumber: string;
  events: string;
  updateBy: string;
  tags: string;
};

const emptyForm: JournalFormState = {
  title: "",
  date: "",
  sessionNumber: "",
  events: "",
  updateBy: "",
  tags: "",
};

export default function JournalSection({ campaignId }: JournalSectionProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [form, setForm] = useState<JournalFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadEntries = async () => {
    if (!campaignId) {
      setEntries([]);
      setSelectedEntry(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/journal?campaignId=${encodeURIComponent(campaignId)}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar las entradas del diario");
      }

      const data = await res.json();
      setEntries(data);

      setSelectedEntry((current: JournalEntry | null) => {
        if (current && data.some((entry: JournalEntry) => entry._id === current._id)) {
          return data.find((entry: JournalEntry) => entry._id === current._id) ?? current;
        }
        return data[0] ?? null;
      });
    } catch (err: any) {
      setError(err.message || "Error cargando el diario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [campaignId]);

  const sessionNumbers = useMemo(() => {
    return [...new Set(entries.map((entry) => entry.sessionNumber).filter((value) => value !== null && value !== undefined))].sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !search ||
        entry.title.toLowerCase().includes(search.toLowerCase()) ||
        entry.events.toLowerCase().includes(search.toLowerCase()) ||
        (entry.updateBy || "").toLowerCase().includes(search.toLowerCase());

      const matchesSession =
        !sessionFilter || entry.sessionNumber === Number(sessionFilter);

      return matchesSearch && matchesSession;
    });
  }, [entries, search, sessionFilter]);

  useEffect(() => {
    if (!selectedEntry && filteredEntries.length > 0) {
      setSelectedEntry(filteredEntries[0]);
      return;
    }

    if (
      selectedEntry &&
      !filteredEntries.some((entry) => entry._id === selectedEntry._id)
    ) {
      setSelectedEntry(filteredEntries[0] ?? null);
    }
  }, [filteredEntries, selectedEntry]);

  const startCreate = () => {
    if (!campaignId) return;

    setIsEditing(true);
    setEditingEntryId(null);
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selectedEntry) return;

    setIsEditing(true);
    setEditingEntryId(selectedEntry._id);
    setForm({
      title: selectedEntry.title || "",
      date: selectedEntry.date ? new Date(selectedEntry.date).toISOString().split("T")[0] : "",
      sessionNumber:
        selectedEntry.sessionNumber !== null && selectedEntry.sessionNumber !== undefined
          ? String(selectedEntry.sessionNumber)
          : "",
      events: selectedEntry.events || "",
      updateBy: selectedEntry.updateBy || "",
      tags: selectedEntry.tags?.join(", ") || "",
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingEntryId(null);
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

      if (!form.title.trim()) {
        setError("El título es obligatorio");
        return;
      }

      if (!form.events.trim()) {
        setError("Los eventos son obligatorios");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        campaignId,
        title: form.title.trim(),
        date: form.date ? new Date(form.date).toISOString() : undefined,
        sessionNumber: form.sessionNumber.trim() === "" ? null : Number(form.sessionNumber),
        events: form.events.trim(),
        updateBy: form.updateBy.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const isEdit = Boolean(editingEntryId);
      const url = isEdit ? `/api/journal/${editingEntryId}` : "/api/journal";
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
        throw new Error(data?.error || "No se pudo guardar la entrada del diario");
      }

      await loadEntries();
      setSelectedEntry(data);
      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Error guardando la entrada");
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
    return <p>Selecciona una campaña para ver su diario.</p>;
  }

  if (loading) return <p>Cargando diario...</p>;
  if (error && !isEditing) return <p>{error}</p>;

  return (
    <div className="journal-section">
      <div className="npc-filters">
        <input
          className="compendium-search"
          type="text"
          placeholder="Buscar entrada por título, eventos o autor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="compendium-select"
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
        >
          <option value="">Todas las sesiones</option>
          {sessionNumbers.map((sessionNumber) => (
            <option key={sessionNumber} value={sessionNumber}>
              Sesión {sessionNumber}
            </option>
          ))}
        </select>

        <button className="compendium-action-button" onClick={startCreate}>
          Nueva entrada
        </button>

        <button
          className="compendium-action-button"
          onClick={startEdit}
          disabled={!selectedEntry}
        >
          Editar entrada
        </button>
      </div>

      <div className="npc-layout">
        <div className="npc-list">
          {filteredEntries.length === 0 ? (
            <p>No hay entradas que coincidan con los filtros.</p>
          ) : (
            filteredEntries.map((entry) => (
              <button
                key={entry._id}
                className={`npc-list-item ${selectedEntry?._id === entry._id ? "active" : ""}`}
                onClick={() => setSelectedEntry(entry)}
              >
                <strong>{entry.title}</strong>
                <span>
                  {entry.sessionNumber ? `Sesión ${entry.sessionNumber}` : "Sin sesión"} ·{" "}
                  {formatDate(entry.date)}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="npc-detail">
          {isEditing ? (
            <div className="npc-form">
              <h4>{editingEntryId ? "Editar entrada" : "Nueva entrada"}</h4>

              {error ? <p>{error}</p> : null}

              <input
                className="compendium-input"
                name="title"
                placeholder="Título"
                value={form.title}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="sessionNumber"
                type="number"
                placeholder="Número de sesión"
                value={form.sessionNumber}
                onChange={handleChange}
              />

              <input
                className="compendium-input"
                name="updateBy"
                placeholder="Actualizado por"
                value={form.updateBy}
                onChange={handleChange}
              />

              <textarea
                className="compendium-textarea"
                name="events"
                placeholder="Eventos"
                value={form.events}
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
          ) : selectedEntry ? (
            <>
              <h4>{selectedEntry.title}</h4>

              <p>
                <strong>Fecha:</strong> {formatDate(selectedEntry.date)}
              </p>

              <p>
                <strong>Sesión:</strong>{" "}
                {selectedEntry.sessionNumber ?? "—"}
              </p>

              <p>
                <strong>Actualizado por:</strong> {selectedEntry.updateBy || "—"}
              </p>

              <p>
                <strong>Eventos:</strong> {selectedEntry.events || "—"}
              </p>

              <p>
                <strong>Creado:</strong> {formatDate(selectedEntry.createdAt)}
              </p>

              <p>
                <strong>Última actualización:</strong> {formatDate(selectedEntry.updatedAt)}
              </p>

              {selectedEntry.tags?.length ? (
                <div className="compendium-tags">
                  {selectedEntry.tags.map((tag) => (
                    <span key={tag} className="compendium-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>Selecciona una entrada para ver sus detalles.</p>
          )}
        </div>
      </div>
    </div>
  );
}