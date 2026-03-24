import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { motion } from "framer-motion";

export default function AudioPanel() {
  const { socket, tableId, showToast } = useSocket();
  const [audioSrc, setAudioSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [audioTitle, setAudioTitle] = useState<string>("Ningún audio cargado");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // === Listeners sincronizados ===
  useEffect(() => {
    if (!socket) return;

    // Cuando llega un audio nuevo a la mesa
    const onLoad = ({ url, by }: { url: string; by?: string }) => {
      setAudioSrc(url);
      // Título: usar el nombre de archivo si existe, o la URL
      const parts = url.split("/");
      const fileName = decodeURIComponent(parts[parts.length - 1] || "Audio remoto");
      setAudioTitle(fileName);
      setIsPlaying(false);
      showToast(`🎵 Audio cargado${by ? ` por ${by}` : ""}`);
    };

    const onPlay = () => {
      if (!audioRef.current) return;
      if (!audioSrc) return; // si no hay src, no podemos reproducir
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Error al reproducir audio:", err);
          showToast("❌ Error al reproducir audio");
        });
    };

    const onPause = () => {
      setIsPlaying(false);
      audioRef.current?.pause();
      showToast("⏸️ Música pausada");
    };

    const onStop = () => {
      setIsPlaying(false);
      setAudioSrc("");
      setAudioTitle("Ningún audio cargado");
      audioRef.current?.pause();
      showToast("⏹️ Reproducción detenida");
    };

    const onVolume = ({ volume: v }: { volume: number }) => {
      setVolume(v);
    };

    socket.on("audio:load", onLoad);
    socket.on("audio:play", onPlay);
    socket.on("audio:pause", onPause);
    socket.on("audio:stop", onStop);
    socket.on("audio:volume", onVolume);

    return () => {
      socket.off("audio:load", onLoad);
      socket.off("audio:play", onPlay);
      socket.off("audio:pause", onPause);
      socket.off("audio:stop", onStop);
      socket.off("audio:volume", onVolume);
    };
  }, [socket, audioSrc, showToast]);

  // === Volumen local + sincronizado ===
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // === Play/Pause ===
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audioSrc) {
      showToast("⚠️ No hay audio cargado");
      return;
    }
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      socket?.emit("audio:pause", { tableId });
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          // Importante: ahora el server no necesita el src aquí
          socket?.emit("audio:play", { tableId });
          showToast(`▶️ Reproduciendo: ${audioTitle}`);
        })
        .catch((err) => {
          console.error("Error al reproducir audio:", err);
          showToast("❌ Error al reproducir audio");
        });
    }
  };

  // === Subir archivo local (ahora SÍ al backend) ===
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const form = new FormData();
      form.append("audio", file);
      form.append("tableId", tableId);
      form.append("by", "Sistema"); // o tu nombre si lo prefieres

      const res = await fetch("/api/upload-audio", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Fallo subiendo audio");
      }

      const data: { url: string; absUrl: string; filename?: string } = await res.json();
      // El server ya emitió "audio:load" a la mesa, así que todos recibirán el src.
      // Opcional: auto-play tras carga
      socket?.emit("audio:play", { tableId });
      showToast(`📁 Archivo cargado: ${data.filename || file.name}`);
    } catch (err: any) {
      console.error(err);
      showToast(`❌ Error al subir audio: ${err.message || err}`);
    } finally {
      // reset input
      e.currentTarget.value = "";
    }
  };

  // === Cargar desde enlace ===
  const handleLink = () => {
    const url = prompt("Introduce el enlace del audio (MP3):");
    if (!url) return;
    // Distribuir la URL a toda la mesa
    socket?.emit("audio:load", { tableId, url, by: "link" });
    // Auto-play sincronizado
    socket?.emit("audio:play", { tableId });
    showToast(`🌐 Enlace cargado: ${url}`);
  };

  return (
    <section className="audio-panel">
      <h3 style={{ marginBottom: 6 }}>🎵 Música / Audio</h3>

      {/* Título del audio actual */}
      <div style={{ fontSize: 14, marginBottom: 8, color: "var(--muted)" }}>
        <strong>{audioTitle}</strong>
      </div>

      {/* Controles de audio */}
      <div className="audio-controls" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <motion.button className="btn-small" whileTap={{ scale: 0.95 }} onClick={togglePlay}>
          {isPlaying ? "⏸️ Pausa" : "▶️ Play"}
        </motion.button>

        <button
          className="btn-small"
          onClick={() => {
            socket?.emit("audio:stop", { tableId });
          }}
        >
          ⏹️ Stop
        </button>

        <button className="btn-small" onClick={handleLink}>
          🌐 Cargar por enlace
        </button>

        <label className="btn-small" style={{ cursor: "pointer" }}>
          📁 Subir
          <input type="file" accept="audio/*" hidden onChange={handleFile} />
        </label>
      </div>

      {/* Control de volumen */}
      <div style={{ marginTop: 10 }}>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>
          Volumen: {(volume * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            setVolume(v);
            socket?.emit("audio:volume", { tableId, volume: v });
          }}
          style={{ width: "100%" }}
        />
      </div>

      {/* Elemento de audio oculto */}
      <audio ref={audioRef} src={audioSrc} onEnded={() => setIsPlaying(false)} />
    </section>
  );
}
