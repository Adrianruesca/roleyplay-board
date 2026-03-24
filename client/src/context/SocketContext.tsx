import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { AnimatePresence, motion } from "framer-motion";

const serverUrl =
  import.meta.env.VITE_SERVER_URL || window.location.origin;

type UserInfo = { id: string; name: string; tableId: string };

type SocketContextType = {
  socket: Socket | null;
  connected: boolean;
  name: string;
  tableId: string;
  users: UserInfo[]; // 👈 lista de usuarios conectados
  setName: (v: string) => void;
  setTableId: (v: string) => void;
  joinTable: () => void;
  showToast: (msg: string) => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  name: "",
  tableId: "mesa-1",
  users: [],
  setName: () => {},
  setTableId: () => {},
  joinTable: () => {},
  showToast: () => {},
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("");
  const [tableId, setTableId] = useState("mesa-1");
  const [users, setUsers] = useState<UserInfo[]>([]);

  // Toasts
  const [toasts, setToasts] = useState<{ id: string; msg: string }[]>([]);

  const showToast = (msg: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  // === Inicializar socket ===
  useEffect(() => {
    const s = io(serverUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"], // 🔧 mejora conexión externa
    });
    setSocket(s);

    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => {
      setConnected(false);
      setUsers([]); // Limpia lista al desconectar
    });

    // === Eventos de notificación ===
    s.on("dice:result", () => showToast("🎲 Tirada realizada"));
    s.on("duel:start", () => showToast("⚔️ Duelo iniciado"));
    s.on("duel:result", ({ winner }: any) =>
      showToast(winner === "Empate" ? "🤝 Duelo empatado" : `🏆 ${winner} ganó el duelo`)
    );
    s.on("audio:load", () => showToast("🎵 Nueva música cargada"));
    s.on("audio:play", () => showToast("▶️ Reproducción iniciada"));
    s.on("audio:pause", () => showToast("⏸️ Música pausada"));
    s.on("token:created", () => showToast("🔹 Token creado"));
    s.on("board:update", () => showToast("🗺️ Fondo actualizado"));

    // === Usuarios conectados ===
    s.on("table:users", (list: UserInfo[]) => {
      setUsers(list);
      console.log("👥 Usuarios conectados:", list);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const joinTable = () => {
    if (!name.trim() || !socket) return alert("Introduce tu nombre");
    socket.connect();
    socket.emit("table:join", { tableId, name });
    showToast(`✅ Te has unido a ${tableId}`);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        name,
        tableId,
        users,
        setName,
        setTableId,
        joinTable,
        showToast,
      }}
    >
      {children}

      {/* === Toast Container === */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              style={{
                background: "var(--panel-bg)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 14px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                color: "var(--text)",
                fontWeight: 600,
                minWidth: 200,
              }}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SocketContext.Provider>
  );
}
