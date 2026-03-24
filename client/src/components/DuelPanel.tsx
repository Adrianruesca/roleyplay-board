import { useEffect, useMemo, useState } from "react";

type Props = {
  socket: any;
  tableId: string;
  name: string;
  users: { id: string; name: string; tableId: string }[];
};

type DuelData = {
  room: string;
  players: string[];
};

export default function DuelPanel({ socket, tableId, name, users }: Props) {
  const [duel, setDuel] = useState<DuelData | null>(null);
  const [challengeFrom, setChallengeFrom] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [hasChosen, setHasChosen] = useState(false);
  const [busy, setBusy] = useState(false); // bloquea nuevos desafíos

  // Para saber si hay oponente en lista
  const opponents = useMemo(
    () => users.filter((u) => u.name !== name),
    [users, name]
  );

  useEffect(() => {
    if (!socket) return;

    const onChallenge = ({ from }: any) => {
      if (busy || duel) {
        // Si estoy ocupado, rechazo automático (opcional)
        socket.emit("duel:decline", { challenger: from });
        return;
      }
      setChallengeFrom(from);
    };

    const onStart = (data: DuelData) => {
      setDuel(data);
      setChallengeFrom(null);
      setHasChosen(false);
      setResult(null);
      setBusy(true);
    };

    const onResult = (payload: any) => {
      setResult(payload);
      setDuel(null);
      setBusy(false);
    };

    const onCancelled = ({ by }: any) => {
      setDuel(null);
      setHasChosen(false);
      setBusy(false);
      setResult({ cancelled: true, by });
    };

    socket.on("duel:challenge", onChallenge);
    socket.on("duel:start", onStart);
    socket.on("duel:result", onResult);
    socket.on("duel:cancelled", onCancelled);

    return () => {
      socket.off("duel:challenge", onChallenge);
      socket.off("duel:start", onStart);
      socket.off("duel:result", onResult);
      socket.off("duel:cancelled", onCancelled);
    };
  }, [socket, busy, duel]);

  const sendChallenge = (opponent: string) => {
    if (!socket || busy || duel) return;
    socket.emit("duel:request", { tableId, opponent });
    setBusy(true); // prevenimos spam mientras espera respuesta
  };

  const acceptChallenge = () => {
    if (!socket || !challengeFrom) return;
    socket.emit("duel:accept", { tableId, challenger: challengeFrom });
  };

  const declineChallenge = () => {
    if (!socket || !challengeFrom) return;
    socket.emit("duel:decline", { challenger: challengeFrom });
    setChallengeFrom(null);
    setBusy(false);
  };

  const cancelDuel = () => {
    if (!socket || !duel) return;
    socket.emit("duel:cancel");
  };

  const sendMove = (move: string) => {
    if (!duel || !socket || hasChosen) return;
    socket.emit("duel:move", { room: duel.room, tableId, player: name, move });
    setHasChosen(true);
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginTop: 12 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700 }}>⚔️ Duelo</h3>

      {/* Desafiar (deshabilitado si ocupado) */}
      {!duel && !challengeFrom && (
        <>
          <p>Selecciona a quién desafiar:</p>
          {opponents.map((u) => (
            <button
              key={u.id}
              onClick={() => sendChallenge(u.name)}
              style={{ ...btnSmall, opacity: busy ? 0.5 : 1, pointerEvents: busy ? "none" : "auto" }}
              disabled={busy}
            >
              Desafiar a {u.name}
            </button>
          ))}
          {busy && <p style={{ opacity: 0.7, marginTop: 6 }}>Esperando respuesta…</p>}
        </>
      )}

      {/* Desafío recibido */}
      {challengeFrom && !duel && (
        <div style={{ marginTop: 10 }}>
          <p>Has sido desafiado por <b>{challengeFrom}</b> ⚔️</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={acceptChallenge} style={btnSmall}>Aceptar</button>
            <button onClick={declineChallenge} style={btnSmall}>Rechazar</button>
          </div>
        </div>
      )}

      {/* Duelo activo */}
      {duel && (
        <div style={{ marginTop: 10 }}>
          <p>Duelo entre {duel.players.join(" vs ")} </p>
          {!hasChosen ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Ataque", "Defensa", "Especial", "Legendario"].map((m) => (
                <button key={m} onClick={() => sendMove(m)} style={btnMove}>
                  {m}
                </button>
              ))}
            </div>
          ) : (
            <p>Esperando al oponente…</p>
          )}

          <div style={{ marginTop: 8 }}>
            <button onClick={cancelDuel} style={btnSmall}>Cancelar duelo</button>
          </div>
        </div>
      )}

      {/* Resultado / mensajes */}
      {result && (
        <div style={{ marginTop: 10, padding: 8, border: "1px solid #ddd", borderRadius: 8 }}>
          {result.cancelled ? (
            <p>❌ Duelo cancelado por <b>{result.by}</b>.</p>
          ) : (
            <>
              <p><b>Resultado del duelo</b></p>
              <p>{result.player1}: {result.move1}</p>
              <p>{result.player2}: {result.move2}</p>
              <h4>
                {result.winner === "Empate"
                  ? "🤝 Empate"
                  : result.winner === name
                  ? "🏆 ¡Has ganado!"
                  : `😖 Ha ganado ${result.winner}`}
              </h4>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const btnSmall: React.CSSProperties = {
  margin: "4px 0",
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #111827",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const btnMove: React.CSSProperties = {
  ...btnSmall,
  flex: "1 1 100px",
  padding: "10px 14px",
};
