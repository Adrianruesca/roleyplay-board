import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Toast({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: "var(--panel-bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            fontWeight: 600,
            color: "var(--text)",
            zIndex: 9999,
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
