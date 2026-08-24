"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import "../globals.css";

export default function SetupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [clientId, setClientId] = useState("my-workspace");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>Loading Setup...</div>;
  }

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, name: clientId })
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create workspace");
      }
      
      const newWorkspace = await res.json();
      router.push(`/dashboard?workspaceId=${newWorkspace.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  };

  return (
    <div className="layout" style={{ justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
      <div className="neu-flat" style={{ width: '400px', textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="logo" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <h1>ZeroConfig</h1>
        </div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-main)', fontWeight: 800 }}>Create Workspace</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
          Generate a secure, encrypted token to authenticate your tunnel agent and web dashboard.
        </p>

        <div style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>WORKSPACE ID</label>
          <input 
            type="text" 
            className="neu-input"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            placeholder="my-workspace"
            required
          />
        </div>

        {error && <div style={{ color: 'var(--error)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>{error}</div>}

        <button 
          className="neu-btn" 
          style={{ width: '100%', padding: '1rem', marginTop: '1rem', color: 'var(--accent)' }}
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Secure Token"}
        </button>
      </div>
    </div>
  );
}
