import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Board from "./components/Board";
import ChatPanel from "./components/ChatPanel";
import "./index.css";

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);

  const className = [
    "app-container",
    sidebarCollapsed ? "no-sidebar" : "",
    chatCollapsed ? "no-chat" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
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
  );
}
