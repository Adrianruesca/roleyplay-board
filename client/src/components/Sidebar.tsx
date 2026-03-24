import DuelPanel from "./DuelPanel";
import ThemeToggle from "./ThemeToggle";
import { useSocket } from "../context/SocketContext";
import { useState } from "react";
import AudioPanel from "./AudioPanel";

type SidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { socket, connected, name, setName, tableId, setTableId, joinTable, users } =
    useSocket();

  const [count, setCount] = useState(1);
  const [sides, setSides] = useState(6);
  const [mod, setMod] = useState(0);

  const roll = (customSides?: number) => {
    if (!socket) return;
    const s = customSides ?? sides;
    socket.emit("dice:roll", {
      tableId,
      count: Number(count),
      sides: s,
      mod: Number(mod),
    });
  };

  // ======== SIDEBAR COLAPSADA ========
  if (collapsed) {
    return (
      <aside className="sidebar sidebar-collapsed">
        <button className="panel-toggle-btn" onClick={onToggle}>
          ❱
        </button>
      </aside>
    );
  }

  // ======== SIDEBAR NORMAL ========
  return (
    <aside className="sidebar">
      <div className="sidebar-header-row">
        <h2 className="text-lg font-bold mb-2"> Menú</h2>
        <button className="panel-toggle-btn" onClick={onToggle}>❰</button>
      </div>

      <div className="section">
        <h3>Conexión</h3>

        {!connected ? (
          <>
            <input
              className="input"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input"
              placeholder="Mesa"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
            />
            <button onClick={joinTable} className="btn" style={{ width: "100%" }}>
              Unirme
            </button>
            <p className="small-muted">
              Estado: {connected ? "🟢 Conectado" : "🔴 Desconectado"}
            </p>
          </>
        ) : (
          <>
            <p className="small-muted">
              Conectado como <strong>{name || "—"}</strong> en{" "}
              <strong>{tableId || "—"}</strong>.
            </p>
            <p className="small-muted">Estado: 🟢 Conectado</p>
          </>
        )}
      </div>

      <div className="section">
        <h3>Usuarios</h3>
        <ul className="user-list">
          {users.length > 0 ? (
            users.map((u) => <li key={u.id}>{u.name}</li>)
          ) : (
            <li className="small-muted">Sin usuarios</li>
          )}
        </ul>
      </div>

      <AudioPanel />

      <div className="section">
        <h3>Dados rápidos</h3>
        <div className="dice-buttons">
          {[4, 6, 8, 10, 12, 20, 100].map((d) => (
            <button key={d} onClick={() => roll(d)} className="btn-small">
              d{d}
            </button>
          ))}
        </div>

        <hr style={{ margin: "10px 0", border: "1px solid var(--border)" }} />

        <h3>Tirada personalizada</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <div className="dice-control">
            <span>Número</span>
            <div className="counter">
              <button className="btn-mini" onClick={() => setCount(Math.max(1, count - 1))}>
                −
              </button>
              <span>{count}</span>
              <button className="btn-mini" onClick={() => setCount(count + 1)}>+</button>
            </div>
          </div>

          <div className="dice-control">
            <span>Dado</span>
            <select
              className="input"
              value={sides}
              onChange={(e) => setSides(Number(e.target.value))}
            >
              {[4, 6, 8, 10, 12, 20, 100].map((d) => (
                <option key={d} value={d}>
                  d{d}
                </option>
              ))}
            </select>
          </div>

          <div className="dice-control">
            <span>Bonificador</span>
            <div className="counter">
              <button className="btn-mini" onClick={() => setMod(mod - 1)}>−</button>
              <span>{mod >= 0 ? `+${mod}` : mod}</span>
              <button className="btn-mini" onClick={() => setMod(mod + 1)}>+</button>
            </div>
          </div>

          <button onClick={() => roll()} className="btn" style={{ width: "100%", marginTop: 8 }}>
            Tirar
          </button>
        </div>
      </div>

      {socket && connected && (
        <div className="section">
          <h3>Duelos</h3>
          <DuelPanel socket={socket} tableId={tableId} name={name} users={users} />
        </div>
      )}

      <div className="bottom" style={{ marginTop: "auto" }}>
        <ThemeToggle />
      </div>
    </aside>
  );
}
