import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { motion } from "framer-motion";

type Token = {
  id: string;
  x: number;
  y: number;
  img?: string;
  size: number;
};

export default function TokensLayer() {
  const { socket, tableId, showToast } = useSocket();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [locked, setLocked] = useState(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  // Input real de archivo
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingSize, setPendingSize] = useState<number | null>(null);

  // === Crear token ===
  const createToken = (size: number) => {
    if (locked) {
      showToast("🔒 Tablero bloqueado");
      return;
    }

    setPendingSize(size);
    fileInputRef.current?.click();
  };

  // === Archivo seleccionado ===
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || locked) return;

    const size = pendingSize ?? 1;
    const url = URL.createObjectURL(file);

    const id =
      (crypto as any)?.randomUUID?.() ||
      `token-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const newToken: Token = { id, x: 100, y: 100, img: url, size };

    // Local
    setTokens((prev) => [...prev, newToken]);

    // Sync
    if (socket && tableId) {
      socket.emit("token:create", { tableId, ...newToken });
    }

    showToast(`🧩 Token (${size}x) creado`);
    setPendingSize(null);
  };

  // === Eliminar token ===
  const deleteToken = (id: string) => {
    if (locked) return;

    setTokens((prev) => prev.filter((t) => t.id !== id));
    socket?.emit("token:delete", { tableId, id });
  };

  // === Limpiar tokens ===
  const clearTokens = () => {
    if (locked) return;

    setTokens([]);
    socket?.emit("token:clearAll", { tableId });
  };

  // === Bloquear ===
  const toggleLock = () => {
    const newState = !locked;
    setLocked(newState);
    socket?.emit("token:lock", { tableId, locked: newState });
    showToast(newState ? "🔒 Tablero bloqueado" : "🔓 Tablero desbloqueado");
  };

  // === Drag ===
  const onMouseDown = (e: React.MouseEvent, id: string) => {
    if (locked) return;

    const token = tokens.find((t) => t.id === id);
    if (!token) return;

    dragging.current = {
      id,
      offsetX: e.clientX - token.x,
      offsetY: e.clientY - token.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || locked || !boardRef.current) return;

    const { id, offsetX, offsetY } = dragging.current;
    const rect = boardRef.current.getBoundingClientRect();
    const token = tokens.find((t) => t.id === id);
    if (!token) return;

    const sizePx = token.size * 48;

    const newX = Math.min(Math.max(e.clientX - offsetX, 0), rect.width - sizePx);
    const newY = Math.min(Math.max(e.clientY - offsetY, 0), rect.height - sizePx);

    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, x: newX, y: newY } : t)));
    socket?.emit("token:move", { tableId, id, x: newX, y: newY });
  };

  const onMouseUp = () => {
    dragging.current = null;
  };

  // === Socket listeners ===
  useEffect(() => {
    if (!socket) return;

    const onCreated = (data: Token) =>
      setTokens((prev) => (prev.some((t) => t.id === data.id) ? prev : [...prev, data]));
    const onMoved = (data: { id: string; x: number; y: number }) =>
      setTokens((prev) => prev.map((t) => (t.id === data.id ? { ...t, x: data.x, y: data.y } : t)));
    const onDeleted = ({ id }: { id: string }) =>
      setTokens((prev) => prev.filter((t) => t.id !== id));
    const onCleared = () => setTokens([]);
    const onLockState = ({ locked }: { locked: boolean }) => setLocked(locked);

    socket.on("token:created", onCreated);
    socket.on("token:moved", onMoved);
    socket.on("token:deleted", onDeleted);
    socket.on("token:cleared", onCleared);
    socket.on("token:lockState", onLockState);

    return () => {
      socket.off("token:created", onCreated);
      socket.off("token:moved", onMoved);
      socket.off("token:deleted", onDeleted);
      socket.off("token:cleared", onCleared);
      socket.off("token:lockState", onLockState);
    };
  }, [socket]);

  return (
    <div
      ref={boardRef}
      className="tokens-layer"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 10,
        pointerEvents: "none", // 👈 TODO EL LAYER es transparente al ratón
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {/* Input de archivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      {/* === TOKENS === */}
      {tokens.map((t) => (
        <motion.div
          key={t.id}
          className="token"
          title="Clic derecho para eliminar"
          style={{
            position: "absolute",
            left: t.x,
            top: t.y,
            width: `${48 * t.size}px`,
            height: `${48 * t.size}px`,
            borderRadius: "50%",
            overflow: "hidden",
            border: "2px solid var(--border)",
            cursor: locked ? "not-allowed" : "grab",
            backgroundColor: "#222",
            pointerEvents: "auto", // 👈 SOLO EL TOKEN recibe eventos
          }}
          onMouseDown={(e) => onMouseDown(e, t.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            deleteToken(t.id);
          }}
        >
          {t.img ? (
            <img
              src={t.img}
              alt="token"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
              }}
            />
          ) : (
            <span
              style={{
                color: "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                fontSize: 12,
              }}
            >
              ?
            </span>
          )}
        </motion.div>
      ))}

      {/* === CONTROLES DM === */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          zIndex: 20,
          pointerEvents: "auto", // 👈 LOS BOTONES SÍ RECIBEN EVENTOS
        }}
      >
        <button className="btn-small" onClick={() => createToken(1)} disabled={locked}>
          ➕ Token normal
        </button>
        <button className="btn-small" onClick={() => createToken(2)} disabled={locked}>
          ⬆️ Token grande
        </button>
        <button className="btn-small" onClick={() => createToken(4)} disabled={locked}>
          🧱 Token gigante
        </button>
        <button className="btn-small" onClick={clearTokens} disabled={locked}>
          🗑️ Limpiar
        </button>
        <button
          className="btn-small"
          onClick={toggleLock}
          style={{
            background: locked ? "var(--error)" : "var(--success)",
            color: "#fff",
          }}
        >
          {locked ? "🔒 Bloqueado" : "🔓 Desbloqueado"}
        </button>
      </div>
    </div>
  );
}
