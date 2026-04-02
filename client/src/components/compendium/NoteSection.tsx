import { useEffect, useMemo, useState } from "react";

type Note = {
  _id: string;
  campaignId: string;
  title: string;
  category: "book" | "letter" | "note";
  author?: string;
  text: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type NoteSectionProps = {
  campaignId: string;
};

type NoteFormState = {
  title: string;
  category: string;
  author: string;
  text: string;
  tags: string;
};

const emptyForm: NoteFormState = {
  title: "",
  category: "",
  author: "",
  text: "",
  tags: "",
};

const noteCategories = ["book", "letter", "note"];

export default function NoteSection({ campaignId }: NoteSectionProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [form, setForm] = useState<NoteFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadNotes = async () => {
    if (!campaignId) {
      setNotes([]);
      setSelectedNote(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/notes?campaignId=${encodeURIComponent(campaignId)}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar las notas");
      }

      const data = await res.json();
      setNotes(data);

      setSelectedNote((current: Note | null) => {
        if (current && data.some((note: Note) => note._id === current._id)) {
          return data.find((note: Note) => note._id === current._id) ?? current;
        }
        return data[0] ?? null;
      });
    } catch (err: any) {
      setError(err.message || "Error cargando notas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [campaignId]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        !search ||
        note.title.toLowerCase().includes(search.toLowerCase()) ||
        note.text.toLowerCase().includes(search.toLowerCase()) ||
        (note.author || "").toLowerCase().includes(search.toLowerCase());

      const matchesCategory = !categoryFilter || note.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [notes, search, categoryFilter]);

  useEffect(() => {
    if (!selectedNote && filteredNotes.length > 0) {
      setSelectedNote(filteredNotes[0]);
      return;
    }

    if (
      selectedNote &&
      !filteredNotes.some((note) => note._id === selectedNote._id)
    ) {
      setSelectedNote(filteredNotes[0] ?? null);
    }
  }, [filteredNotes, selectedNote]);

  const startCreate = () => {
    if (!campaignId) return;
    setIsEditing(true);
    setEditingNoteId(null);
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selectedNote) return;

    setIsEditing(true);
    setEditingNoteId(selectedNote._id);
    setForm({
      title: selectedNote.title || "",
      category: selectedNote.category || "",
      author: selectedNote.author || "",
      text: selectedNote.text || "",
      tags: selectedNote.tags?.join(", ") || "",
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingNoteId(null);
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

      if (!form.category.trim()) {
        setError("La categoría es obligatoria");
        return;
      }

      if (!form.text.trim()) {
        setError("El texto es obligatorio");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        campaignId,
        title: form.title.trim(),
        category: form.category,
        author: form.author.trim(),
        text: form.text.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const isEdit = Boolean(editingNoteId);
      const url = isEdit ? `/api/notes/${editingNoteId}` : "/api/notes";
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
        throw new Error(data?.error || "No se pudo guardar la nota");
      }

      await loadNotes();
      setSelectedNote(data);
      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Error guardando nota");
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
    return <p>Selecciona una campaña para ver sus notas.</p>;
  }

  if (loading) return <p>Cargando notas...</p>;
  if (error && !isEditing) return <p>{error}</p>;

  return (
    <div className="note-section">
      <div className="npc-filters">
        <input
          className="compendium-search"
          type="text"
          placeholder="Buscar nota..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="compendium-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {noteCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <button className="compendium-action-button" onClick={startCreate}>
          Nueva nota
        </button>

        <button
          className="compendium-action-button"
          onClick={startEdit}
          disabled={!selectedNote}
        >
          Editar nota
        </button>
      </div>

      <div className="npc-layout">
        <div className="npc-list">
          {filteredNotes.length === 0 ? (
            <p>No hay notas que coincidan con los filtros.</p>
          ) : (
            filteredNotes.map((note) => (
              <button
                key={note._id}
                className={`npc-list-item ${selectedNote?._id === note._id ? "active" : ""}`}
                onClick={() => setSelectedNote(note)}
              >
                <strong>{note.title}</strong>
                <span>
                  {note.category} {note.author ? `· ${note.author}` : ""}
                </span>
              </button>
            ))
          )}
        </div>

        <div className="npc-detail">
          {isEditing ? (
            <div className="npc-form">
              <h4>{editingNoteId ? "Editar nota" : "Nueva nota"}</h4>

              {error ? <p>{error}</p> : null}

              <input
                className="compendium-input"
                name="title"
                placeholder="Título"
                value={form.title}
                onChange={handleChange}
              />

              <select
                className="compendium-select"
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="">Selecciona categoría</option>
                {noteCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <input
                className="compendium-input"
                name="author"
                placeholder="Autor"
                value={form.author}
                onChange={handleChange}
              />

              <textarea
                className="compendium-textarea"
                name="text"
                placeholder="Texto"
                value={form.text}
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
          ) : selectedNote ? (
            <>
              <h4>{selectedNote.title}</h4>

              <p>
                <strong>Categoría:</strong> {selectedNote.category || "—"}
              </p>

              <p>
                <strong>Autor:</strong> {selectedNote.author || "—"}
              </p>

              <p>
                <strong>Texto:</strong> {selectedNote.text || "—"}
              </p>

              <p>
                <strong>Creado:</strong> {formatDate(selectedNote.createdAt)}
              </p>

              <p>
                <strong>Actualizado:</strong> {formatDate(selectedNote.updatedAt)}
              </p>

              {selectedNote.tags?.length ? (
                <div className="compendium-tags">
                  {selectedNote.tags.map((tag) => (
                    <span key={tag} className="compendium-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>Selecciona una nota para ver sus detalles.</p>
          )}
        </div>
      </div>
    </div>
  );
}