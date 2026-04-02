import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board";
import ChatPanel from "./components/ChatPanel";
import CompendiumModal from "./components/CompendiumModal";
import "./index.css";

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [compendiumOpen, setCompendiumOpen] = useState(false);

  const className = [
    "app-container",
    sidebarCollapsed ? "no-sidebar" : "",
    chatCollapsed ? "no-chat" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className={className}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((x) => !x)}
        />

        <Board />

        <ChatPanel
          collapsed={chatCollapsed}
          onToggle={() => setChatCollapsed((x) => !x)}
        />
      </div>

      <button className="compendium-open-button" onClick={() => setCompendiumOpen(true)}>
        Compendio
      </button>
      <CompendiumModal open={compendiumOpen} onClose={() => setCompendiumOpen(false)} />
    </>
  );
}
