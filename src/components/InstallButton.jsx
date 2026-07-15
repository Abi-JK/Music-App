// src/components/InstallButton.jsx
import React, { useEffect, useState } from "react";

export default function InstallButton() {
  const [apkUrl, setApkUrl] = useState("");
  const [ipaUrl, setIpaUrl] = useState("");

  useEffect(() => {
    fetch("/api/install")
      .then((r) => r.json())
      .then(({ apkUrl, ipaUrl }) => {
        setApkUrl(apkUrl);
        setIpaUrl(ipaUrl);
      })
      .catch(console.error);
  }, []);

  if (!apkUrl && !ipaUrl) return null;

  const buttonStyle = {
    display: "inline-block",
    padding: "0.6rem 1.2rem",
    margin: "0.3rem",
    background: "linear-gradient(45deg, #00d4e8, #0077b6)",
    color: "#fff",
    borderRadius: "8px",
    textDecoration: "none",
    fontFamily: "'Inter', sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  };

  return (
    <div className="install-btns" style={{ marginTop: "1rem", textAlign: "center" }}>
      {apkUrl && (
        <a href={apkUrl} className="install-link" style={buttonStyle}>
          Install Android (APK)
        </a>
      )}
      {ipaUrl && (
        <a href={ipaUrl} className="install-link" style={buttonStyle}>
          Install iOS (IPA)
        </a>
      )}
    </div>
  );
}
