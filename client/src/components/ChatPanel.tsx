import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { motion, AnimatePresence } from "framer-motion";

type ChatMsg = { id: string; tableId: string; name: string; text: string; ts: string };

const MAX_MSG = 18;

type ChatPanelProps = {
  collapsed?: boolean;
  onToggle?: () => void;
};

export default function ChatPanel({ collapsed, onToggle }: ChatPanelProps) {
  const { socket, connected, name, tableId } = useSocket();
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasNewWhilePaused, setHasNewWhilePaused] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  // === LÓGICA PRINCIPAL (no se toca) ===
  useEffect(() => {
    if (!socket) return;

    const highlightMessage = (id: string) => {
      setHighlightedIds((prev) => [...prev, id]);
      setTimeout(() => {
        setHighlightedIds((prev) => prev.filter((x) => x !== id));
      }, 3000);
    };

    const pushMsg = (newMsg: ChatMsg) => {
      setChat((prev) => {
        const next = [...prev, newMsg];
        return next.length > MAX_MSG ? next.slice(-MAX_MSG) : next;
      });

      if (!autoScroll) setHasNewWhilePaused(true);
      highlightMessage(newMsg.id);
    };

    socket.on("chat:new", pushMsg);

    socket.on("history", (data: any) => {
      const historyMessages: ChatMsg[] = data.messages.map((m: any) => ({
        id: m._id,
        tableId: m.tableId,
        name: m.name,
        text: m.text,
        ts: m.ts,
      }));

      const rollMessages: ChatMsg[] = data.rolls.map((r: any) => ({
        id: r._id,
        tableId: r.tableId,
        name: "Dados",
        text: `${r.by} tira ${r.rolls.length}d${r.sides}${
          r.mod ? `+${r.mod}` : ""
        } → [${r.rolls.join(", ")}] = ${r.total}`,
        ts: r.ts,
      }));

      const combined = [...historyMessages, ...rollMessages].sort(
        (a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
      );

      setChat(combined.slice(-MAX_MSG));

      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "auto" }), 0);
    });

    socket.on("dice:result", (payload: any) => {
      const txt = `${payload.by} tira ${payload.rolls.length}d${payload.sides}${
        payload.mod ? `+${payload.mod}` : ""
      } → [${payload.rolls.join(", ")}] = ${payload.total}`;

      const msg: ChatMsg = {
        id: crypto.randomUUID(),
        tableId: payload.tableId,
        name: "Dados",
        text: txt,
        ts: new Date().toISOString(),
      };

      pushMsg(msg);
    });

    socket.on("chat:cleared", () => {
      setChat([]);
      setHasNewWhilePaused(false);
      setHighlightedIds([]);
    });

    return () => {
      socket.off("chat:new");
      socket.off("history");
      socket.off("dice:result");
      socket.off("chat:cleared");
    };
  }, [socket, autoScroll]);

  const handleScroll = () => {
    const el = chatContainerRef.current;
    if (!el) return;

    const atBottom =
      Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 5;

    setAutoScroll(atBottom);
    if (atBottom) setHasNewWhilePaused(false);
  };

  const sendChat = () => {
    if (!text.trim() || !socket) return;
    socket.emit("chat:send", { tableId, name, text });
    setText("");
  };

  const clearChat = () => {
    if (!socket) return;
    socket.emit("chat:clear", { tableId });
    setChat([]);
    setHasNewWhilePaused(false);
    setHighlightedIds([]);
  };

  const jumpToBottom = () => {
    setAutoScroll(true);
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasNewWhilePaused(false);
  };

  // ================================================================
  // ====================== RETURN PRINCIPAL =========================
  // ================================================================

  return (
    <section
      className={
        collapsed ? "chat-panel chat-panel-collapsed" : "chat-panel"
      }
    >
      {/* === BOTÓN CUANDO ESTÁ OCULTO === */}
      {collapsed && (
        <button
          className="panel-toggle-btn"
          onClick={onToggle}
          style={{ margin: "6px auto" }}
        >
          ❰
        </button>
      )}

      {/* === CONTENIDO SOLO CUANDO ESTÁ ABIERTO === */}
      {!collapsed && (
        <>
          <div className="chat-header-row">
            <h2 className="text-lg font-bold mb-2">💬 Chat</h2>

            <div style={{ display: "flex", gap: 6 }}>
              {!autoScroll && hasNewWhilePaused && (
                <button className="btn-small" onClick={jumpToBottom}>
                  ⬇ Nuevos
                </button>
              )}
              <button className="btn-small" onClick={clearChat}>🧹</button>

              <button className="panel-toggle-btn" onClick={onToggle}>
                ❱
              </button>
            </div>
          </div>

          {!connected && (
            <p className="small-muted">Conéctate desde el menú lateral</p>
          )}

          {connected && (
            <>
              <div
                className="chat-messages"
                ref={chatContainerRef}
                onScroll={handleScroll}
              >
                <AnimatePresence initial={false}>
                  {chat.map((m) => {
                    const isNew = highlightedIds.includes(m.id);
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        style={{
                          marginBottom: 6,
                          padding: "4px 6px",
                          borderRadius: 6,
                          background:
                            m.name === "Dados"
                              ? "var(--panel-bg)"
                              : isNew
                              ? "rgba(255, 255, 0, 0.12)"
                              : "transparent",
                          boxShadow: isNew
                            ? "0 0 0 1px rgba(255, 255, 0, 0.35)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color:
                              m.name === "Dados"
                                ? "var(--accent)"
                                : "var(--text)",
                          }}
                        >
                          {m.name}{" "}
                          <span
                            style={{
                              opacity: 0.6,
                              fontSize: 12,
                            }}
                          >
                            ({new Date(m.ts).toLocaleTimeString()})
                          </span>
                        </div>

                        <div
                          style={{
                            color:
                              m.name === "Dados"
                                ? "var(--accent)"
                                : "var(--text)",
                            fontWeight: m.name === "Dados" ? 600 : 400,
                            fontSize: 14,
                            lineHeight: 1.3,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {m.text}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <div ref={chatEndRef} />
              </div>

              <div className="chat-input">
                <input
                  className="input"
                  placeholder="Escribe un mensaje..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                />

                <motion.button
                  className="btn"
                  onClick={sendChat}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                  ✉
                </motion.button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
