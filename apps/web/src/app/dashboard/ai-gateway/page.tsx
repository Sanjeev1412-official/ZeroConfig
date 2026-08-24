"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import "../../globals.css";

export default function AIGateway() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);
  
  // Data for AI observability visualization
  const [tokenUsage] = useState({ prompt: 14500, completion: 42000, estimatedCost: 0.85 });

  if (status === "loading") {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>Loading AI Gateway...</div>;
  }

  return (
    <div className="layout">
      <div className="app-window">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="app-sidebar">
          <div className="logo" style={{ cursor: 'pointer', marginBottom: '2rem' }} onClick={() => router.push('/')}>
            <div className="neu-flat" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 800, fontSize: '1.2rem' }}>
              Z
            </div>
          </div>
          
          <button className="sidebar-icon" onClick={() => router.push('/dashboard')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
            <span>Live View</span>
          </button>
          
          <button className="sidebar-icon" onClick={() => router.push('/dashboard/policies')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Policies</span>
          </button>

          <button className="sidebar-icon active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span>AI Gateway</span>
          </button>
        </aside>

        {/* ── MAIN CANVAS ── */}
        <div className="app-main-wrapper" style={{ padding: '2rem 3rem' }}>
          <header style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <span style={{ background: 'linear-gradient(98deg, #3b82f6, #a855f7, #ec4899)', WebkitBackgroundClip: 'text', color: 'transparent' }}>AI Gateway</span>
              Observability
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>Track token usage, monitor LLM traffic, and enforce routing rules.</p>
          </header>

          {/* Top Stats */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="floating-card" style={{ flex: 1, padding: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Prompt Tokens</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>{tokenUsage.prompt.toLocaleString()}</div>
            </div>
            <div className="floating-card" style={{ flex: 1, padding: '1.5rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completion Tokens</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>{tokenUsage.completion.toLocaleString()}</div>
            </div>
            <div className="floating-card" style={{ flex: 1, padding: '1.5rem', background: 'var(--bg-card)', border: '2px solid var(--accent)' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>Estimated Cost</span>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.5rem' }}>${tokenUsage.estimatedCost.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '2rem' }}>
            {/* Routing Rules */}
            <div className="floating-card" style={{ flex: 1, padding: '2rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Semantic Routing</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Automatically route <code>/v1/chat/completions</code> requests to different models based on payload or load balancing needs.
              </p>
              
              <div className="neu-pressed" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Route: Default</span>
                  <span className="badge online">Active</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  All traffic goes to <code>http://localhost:11434</code> (Ollama)
                </div>
              </div>
            </div>

            {/* Recent Prompts */}
            <div className="floating-card" style={{ flex: 1, padding: '2rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Traffic Intercept Logs</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="neu-btn" style={{ padding: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>POST /v1/chat/completions</span>
                    <span style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: 700 }}>200</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>~35 tokens (p) / ~120 tokens (c)</span>
                </div>
                <div className="neu-btn" style={{ padding: '1rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>POST /v1/chat/completions</span>
                    <span style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: 700 }}>200</span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>~10 tokens (p) / ~5 tokens (c)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
