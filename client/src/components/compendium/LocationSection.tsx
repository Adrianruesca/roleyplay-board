import { useEffect, useMemo, useState } from "react";

type Location = {
  _id: string;
  campaignId: string;
  name: string;
  type?: string;
  description?: string;
  parentLocationId?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

type LocationSectionProps = {
  campaignId: string;
};

type LocationFormState = {
  name: string;
  type: string;
  description: string;
  parentLocationId: string;
  tags: string;
};

const emptyForm: LocationFormState = {
  name: "",
  type: "",
  description: "",
  parentLocationId: "",
  tags: "",
};

export default function LocationSection({ campaignId }: LocationSectionProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadLocations = async () => {
    if (!campaignId) {
      setLocations([]);
      setSelectedLocation(null);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/locations?campaignId=${encodeURIComponent(campaignId)}`);
      if (!res.ok) {
        throw new Error("No se pudieron cargar las localizaciones");
      }

      const data = await res.json();
      setLocations(data);

      setSelectedLocation((current: Location | null) => {
        if (current && data.some((loc: Location) => loc._id === current._id)) {
          return data.find((loc: Location) => loc._id === current._id) ?? current;
        }
        return data[0] ?? null;
      });
    } catch (err: any) {
      setError(err.message || "Error cargando localizaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, [campaignId]);

  const types = useMemo(() => {
    return [...new Set(locations.map((loc) => loc.type).filter(Boolean))].sort();
  }, [locations]);

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesSearch =
        !search ||
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        (loc.description || "").toLowerCase().includes(search.toLowerCase());

      const matchesType = !typeFilter || loc.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [locations, search, typeFilter]);

  useEffect(() => {
    if (!selectedLocation && filteredLocations.length > 0) {
      setSelectedLocation(filteredLocations[0]);
      return;
    }

    if (
      selectedLocation &&
      !filteredLocations.some((loc) => loc._id === selectedLocation._id)
    ) {
      setSelectedLocation(filteredLocations[0] ?? null);
    }
  }, [filteredLocations, selectedLocation]);

  const startCreate = () => {
    if (!campaignId) return;
    setIsEditing(true);
    setEditingLocationId(null);
    setForm(emptyForm);
  };

  const startEdit = () => {
    if (!selectedLocation) return;

    setIsEditing(true);
    setEditingLocationId(selectedLocation._id);
    setForm({
      name: selectedLocation.name || "",
      type: selectedLocation.type || "",
      description: selectedLocation.description || "",
      parentLocationId: selectedLocation.parentLocationId || "",
      tags: selectedLocation.tags?.join(", ") || "",
    });
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditingLocationId(null);
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

      setSaving(true);
      setError("");

      const payload = {
        campaignId,
        name: form.name.trim(),
        type: form.type.trim(),
        description: form.description.trim(),
        parentLocationId:
          form.parentLocationId.trim() === "" ? null : form.parentLocationId,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const isEdit = Boolean(editingLocationId);
      const url = isEdit ? `/api/locations/${editingLocationId}` : "/api/locations";
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
        throw new Error(data?.error || "No se pudo guardar la localización");
      }

      await loadLocations();
      setSelectedLocation(data);
      cancelEdit();
    } catch (err: any) {
      setError(err.message || "Error guardando localización");
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
    return <p>Selecciona una campaña para ver sus localizaciones.</p>;
  }

  if (loading) return <p>Cargando localizaciones...</p>;
  if (error && !isEditing) return <p>{error}</p>;

  const getParentLocationName = (parentId?: string | null) => {
    if (!parentId) return "—";

    const parent = locations.find((loc) => loc._id === parentId);
    return parent ? parent.name : "—";
  };

  return (
    <div className="location-section">
      <div className="npc-filters">
        <input
          className="compendium-search"
          type="text"
          placeholder="Buscar localización..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="compendium-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <button className="compendium-action-button" onClick={startCreate}>
          Nueva localización
        </button>

        <button
          className="compendium-action-button"
          onClick={startEdit}
          disabled={!selectedLocation}
        >
          Editar localización
        </button>
      </div>

      <div className="npc-layout">
        <div className="npc-list">
          {filteredLocations.length === 0 ? (
            <p>No hay localizaciones.</p>
          ) : (
            filteredLocations.map((loc) => (
              <button
                key={loc._id}
                className={`npc-list-item ${selectedLocation?._id === loc._id ? "active" : ""}`}
                onClick={() => setSelectedLocation(loc)}
              >
                <strong>{loc.name}</strong>
                <span>{loc.type || "Sin tipo"}</span>
              </button>
            ))
          )}
        </div>

        <div className="npc-detail">
          {isEditing ? (
            <div className="npc-form">
              <h4>{editingLocationId ? "Editar localización" : "Nueva localización"}</h4>

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
                name="type"
                placeholder="Tipo"
                value={form.type}
                onChange={handleChange}
              />

              <textarea
                className="compendium-textarea"
                name="description"
                placeholder="Descripción"
                value={form.description}
                onChange={handleChange}
              />

              <select
                className="compendium-select"
                name="parentLocationId"
                value={form.parentLocationId}
                onChange={handleChange}
              >
                <option value="">Sin padre</option>
                {locations
                  .filter((loc) => loc._id !== editingLocationId)
                  .map((loc) => (
                    <option key={loc._id} value={loc._id}>
                      {loc.name}
                    </option>
                  ))}
              </select>

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
          ) : selectedLocation ? (
            <>
              <h4>{selectedLocation.name}</h4>

              <p><strong>Tipo:</strong> {selectedLocation.type || "—"}</p>
              <p><strong>Descripción:</strong> {selectedLocation.description || "—"}</p>
              <p>
                <strong>Parent:</strong>{" "}
                {getParentLocationName(selectedLocation.parentLocationId)}
              </p>

              <p><strong>Creado:</strong> {formatDate(selectedLocation.createdAt)}</p>
              <p><strong>Actualizado:</strong> {formatDate(selectedLocation.updatedAt)}</p>

              {selectedLocation.tags?.length ? (
                <div className="compendium-tags">
                  {selectedLocation.tags.map((tag) => (
                    <span key={tag} className="compendium-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p>Selecciona una localización.</p>
          )}
        </div>
      </div>
    </div>
  );
}