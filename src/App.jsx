// src/App.jsx
import React from "react";
import InstallButton from "./components/InstallButton";

export default function App() {
  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        color: "#fff",
        background: "linear-gradient(135deg, #121212, #1e293b)",
        minHeight: "100vh",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1 style={{ marginBottom: "0.5rem", fontSize: "2.5rem" }}>
        SoundAura PWA
      </h1>
      <p style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
        Free ad‑free music streaming.
      </p>
      <InstallButton />
    </div>
  );
}
