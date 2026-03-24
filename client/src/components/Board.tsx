import { useEffect, useState, useRef } from "react";
import { useSocket } from "../context/SocketContext";
import TokensLayer from "./TokensLayer";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function Board() {
  const { socket, tableId, name } = useSocket();
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"none" | "image" | "video">("none");
  const [input, setInput] = useState("");

  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

  const boardRootRef = useRef<HTMLDivElement | null>(null);
  const playerDivRef = useRef<HTMLDivElement | null>(null);
  const playerInstanceRef = useRef<any>(null);

  // === Detectar tipo de media ===
  const detectMediaType = (url: string) => {
    if (!url) return "none";
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "video";
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(url)) return "image";
    if (url.startsWith(`${serverUrl}/uploads/`)) return "image";
    return "none";
  };

  const setMedia = (url: string) => {
    setMediaUrl(url);
    const t = detectMediaType(url);
    setMediaType(t as any);
  };

  // === Cargar API YouTube ===
  useEffect(() => {
    if (window.YT) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }, []);

  // === Crear / actualizar / destruir player ===
  useEffect(() => {
    // Si NO es video → destruir player si existe
    if (mediaType !== "video") {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch {}
        playerInstanceRef.current = null;
      }
      return;
    }

    if (!playerDivRef.current || !window.YT) return;

    const videoIdMatch = mediaUrl.match(
      /(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    if (!videoId) return;

    // Si ya existe un player
    if (playerInstanceRef.current) {
      try {
        playerInstanceRef.current.loadVideoById(videoId);
      } catch {}
      return;
    }

    // Crear player nuevo
    const newPlayer = new window.YT.Player(playerDivRef.current, {
      videoId,
      events: {
        onReady: () => {},
        onStateChange: () => {},
      },
    });

    playerInstanceRef.current = newPlayer;

    return () => {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch {}
        playerInstanceRef.current = null;
      }
    };
  }, [mediaUrl, mediaType]);

  // === Eventos socket que controlan reproducción global ===
  useEffect(() => {
    if (!socket) return;

    const handlePlay = () => {
      const p = playerInstanceRef.current;
      if (p?.playVideo) p.playVideo();
    };

    const handlePause = () => {
      const p = playerInstanceRef.current;
      if (p?.pauseVideo) p.pauseVideo();
    };

    const handleStop = () => {
      const p = playerInstanceRef.current;
      if (p?.stopVideo) p.stopVideo();
    };

    const onUpdate = ({ url }: { url: string }) => setMedia(url);

    socket.on("video:play", handlePlay);
    socket.on("video:pause", handlePause);
    socket.on("video:stop", handleStop);
    socket.on("board:update", onUpdate);

    return () => {
      socket.off("video:play", handlePlay);
      socket.off("video:pause", handlePause);
      socket.off("video:stop", handleStop);
      socket.off("board:update", onUpdate);
    };
  }, [socket]);

  // === Acciones del usuario ===
  const syncPlay = () => {
    playerInstanceRef.current?.playVideo?.();
    socket?.emit("video:play", { tableId });
  };

  const syncPause = () => {
    playerInstanceRef.current?.pauseVideo?.();
    socket?.emit("video:pause", { tableId });
  };

  const syncStop = () => {
    playerInstanceRef.current?.stopVideo?.();
    socket?.emit("video:stop", { tableId });
  };

  const handleSetMediaFromLink = () => {
    const url = input.trim();
    if (!url) return;

    const t = detectMediaType(url);
    if (t === "none") {
      alert("❌ Enlace no válido. Solo YouTube o imagen");
      return;
    }

    setMedia(url);
    socket?.emit("board:setMedia", { tableId, url, by: name });
    setInput("");
  };

  const handleUploadImage = async (file: File | null) => {
    if (!file) return;

    const fd = new FormData();
    fd.append("image", file);
    fd.append("tableId", tableId);
    fd.append("by", name);

    const res = await fetch(`${serverUrl}/api/upload`, {
      method: "POST",
      body: fd,
    });

    const data = await res.json();
    if (data?.url) {
      setMedia(data.url);
    } else {
      alert("❌ No se pudo subir la imagen");
    }
  };

  const clearMedia = () => {
    setMedia("");
    socket?.emit("board:setMedia", { tableId, url: "", by: name });
  };

  // ============================================================
  // === AQUÍ VIENE EL FIX: no desmontar nodos, solo ocultarlos ===
  // ============================================================

  return (
    <div className="board" ref={boardRootRef}>
      <h2 className="text-lg font-bold mb-2"> Tablero</h2>

      {/* Toolbar */}
      <div className="board-toolbar">
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
          <input
            className="input"
            placeholder="Pega enlace de YouTube o imagen..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button onClick={handleSetMediaFromLink} className="btn">
            Cargar
          </button>
        </div>

        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label htmlFor="up-image" className="btn" style={{ cursor: "pointer" }}>
            Subir imagen…
          </label>
          <input
            id="up-image"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => handleUploadImage(e.target.files?.[0] || null)}
          />

          {mediaType !== "none" && (
            <button className="btn" onClick={clearMedia}>
              ❌ Quitar contenido
            </button>
          )}

          {mediaType === "video" && (
            <>
              <button className="btn-small" onClick={syncPlay}>
                ▶ Reproducir todos
              </button>
              <button className="btn-small" onClick={syncPause}>
                ⏸ Pausar todos
              </button>
              <button className="btn-small" onClick={syncStop}>
                ⏹ Detener todos
              </button>
            </>
          )}
        </div>
      </div>

      {/* === ESCENARIO: elementos permanentes y con display === */}
      <div
        className="board-stage"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* ==== VIDEO (permanente) ==== */}
        <div
          ref={playerDivRef}
          className="board-media"
          style={{
            display: mediaType === "video" ? "block" : "none",
            position: "absolute",
            inset: 0,
            background: "#000",
            borderRadius: 8,
            zIndex: 0,
          }}
        />

        {/* ==== IMAGEN (permanente) ==== */}
        <img
          src={mediaType === "image" ? mediaUrl : ""}
          alt=""
          className="board-media"
          style={{
            display: mediaType === "image" ? "block" : "none",
            position: "absolute",
            inset: 0,
            objectFit: "contain",
            width: "100%",
            height: "100%",
            zIndex: 0,
          }}
        />

        {/* ==== PLACEHOLDER ==== */}
        <div
          style={{
            display: mediaType === "none" ? "flex" : "none",
            position: "absolute",
            inset: 0,
            justifyContent: "center",
            alignItems: "center",
            opacity: 0.6,
            color: "var(--muted)",
            zIndex: 0,
          }}
        >
          No hay contenido cargado
        </div>

        {/* === TOKENS ARRIBA === */}
        <TokensLayer />
      </div>
    </div>
  );
}
