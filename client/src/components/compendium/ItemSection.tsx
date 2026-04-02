import { useEffect, useMemo, useState } from "react";

type Item = {
  _id: string;
  campaignId: string;
  name: string;
  type: "consumable" | "utility" | "equipment";
  description?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type ItemSectionProps = {
  campaignId: string;
};

type ItemFormState = {
  name: string;
  type: string;
  description: string;
  tags: string;
};

const emptyForm: ItemFormState = {
  name: "",
  type: "",
  description: "",
  tags: "",
};

const itemTypes = ["consumable", "utility", "equipment"];

export default function ItemSection({ campaignId }: ItemSectionProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    if (!campaignId) {
      setItems([]);
      setSelectedItem(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/items?campaignId=${encodeURIComponent(campaignId)}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar los objetos");
      }

      const data = await res.json();
      setItems(data);

      setSelectedItem((current: Item | null) => {
        if (current && data.some((item: Item) => item._id === current._id)) {
          return data.find((item: Item) => item._id === current._id) ?? current;
        }
        return data[0] ?? null;
      });
    } catch (err: any) {
      setError(err.message || "Error cargando objetos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [campaignId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description || "").toLowerCase().includes(search.toLowerCase());

      const matchesType = !typeFilter || item.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  useEffect(() => {
    if (!selectedItem && filteredItems.length > 0) {
      setSelectedItem(filteredItems[0]);
      return;
    }

    if (
      selectedItem &&
      !filteredItems.some((item) => item._id === selectedItem._id)
    ) {
      setSelectedItem(filteredItems[0] ?? null);
    }
  }, [filteredItems, selectedItem]);

  const startCreate = () => {
    if (!campaignId) return;
    setIsEditing(true);
    setEditingItemId(null);
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selectedItem) return;

    setIsEditing(true);
    setEditingItemId(selectedItem._id);
    setForm({
      name: selectedItem.name || "",
      type: selectedItem.type || "",
      description: selectedItem.description || "",
      tags: selectedItem.tags?.join(", ") || "",
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingItemId(null);
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

      if (!form.type.trim()) {
        setError("El tipo es obligatorio");
        return;
      }

      setSaving(true);
      setError("");

      const payload = {
        campaignId,
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const isEdit = Boolean(editingItemId);
      const url = isEdit ? `/api/items/${editingItemId}` : "/api/items";
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
        throw new Error(data?.error || "No se pudo guardar el objeto");
      }

      await loadItems();
      setSelectedItem(data);
      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Error guardando objeto");
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
    return <p>Selecciona una campaña para ver sus objetos.</p>;
  }

  if (loading) return <p>Cargando objetos...</p>;
  if (error && !isEditing) return <p>{error}</p>;

  return (
    <div className="item-section">
      <div className="npc-filters">
        <input
          className="compendium-search"
          type="text"
          placeholder="Buscar objeto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="compendium-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {itemTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button className="compendium-action-button" onClick={startCreate}>
          Nuevo objeto
        </button>

        <button
          className="compendium-action-button"
          onClick={startEdit}
          disabled={!selectedItem}
        >
          Editar objeto
        </button>
      </div>

      <div className="npc-layout">
        <div className="npc-list">
          {filteredItems.length === 0 ? (
            <p>No hay objetos que coincidan con los filtros.</p>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item._id}
                className={`npc-list-item ${selectedItem?._id === item._id ? "active" : ""}`}
                onClick={() => setSelectedItem(item)}
              >
                <strong>{item.name}</strong>
                <span>{item.type}</span>
              </button>
            ))
          )}
        </div>

        <div className="npc-detail">
          {isEditing ? (
            <div className="npc-form">
              <h4>{editingItemId ? "Editar objeto" : "Nuevo objeto"}</h4>

              {error ? <p>{error}</p> : null}

              <input
                className="compendium-input"
                name="name"
                placeholder="Nombre"
                value={form.name}
                onChange={handleChange}
              />

              <select
                className="compendium-select"
                name="type"
                value={form.type}
                onChange={handleChange}
              >
                <option value="">Selecciona tipo</option>
                {itemTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <textarea
                className="compendium-textarea"
                name="description"
                placeholder="Descripción"
                value={form.description}
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
          ) : selectedItem ? (
            <>
              <h4>{selectedItem.name}</h4>

              <p>
                <strong>Tipo:</strong> {selectedItem.type || "—"}
              </p>

              <p>
                <strong>Descripción:</strong> {selectedItem.description || "—"}
              </p>

              <p>
                <strong>Creado:</strong> {formatDate(selectedItem.createdAt)}
              </p>

              <p>
                <strong>Actualizado:</strong> {formatDate(selectedItem.updatedAt)}
              </p>

              {selectedItem.tags?.length ? (
                <div className="compendium-tags">
                  {selectedItem.tags.map((tag) => (
                    <span key={tag} className="compendium-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>Selecciona un objeto para ver sus detalles.</p>
          )}
        </div>
      </div>
    </div>
  );
}