"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import "../../globals.css";

export default function Policies() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('rate-limit');

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-muted)' }}>Loading Policies...</div>;
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
          
          <button className="sidebar-icon active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span>Policies</span>
          </button>

          <button className="sidebar-icon" onClick={() => router.push('/dashboard/ai-gateway')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            <span>AI Gateway</span>
          </button>
        </aside>

        {/* ── MAIN CANVAS ── */}
        <div className="app-main-wrapper" style={{ padding: '2rem 3rem' }}>
          <header style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Traffic Policies</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem' }}>Control, route, and secure traffic to your local endpoints.</p>
          </header>

          <div style={{ display: 'flex', gap: '2rem' }}>
            {/* Policy Navigation */}
            <div className="floating-card" style={{ width: '250px', padding: '1rem', height: 'fit-content' }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>
                  <button 
                    className={`neu-btn ${activeTab === 'rate-limit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('rate-limit')}
                    style={{ width: '100%', textAlign: 'left', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    Rate Limiting
                  </button>
                </li>
                <li>
                  <button 
                    className={`neu-btn ${activeTab === 'auth' ? 'active' : ''}`}
                    onClick={() => setActiveTab('auth')}
                    style={{ width: '100%', textAlign: 'left', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Authentication
                  </button>
                </li>
                <li>
                  <button 
                    className={`neu-btn ${activeTab === 'headers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('headers')}
                    style={{ width: '100%', textAlign: 'left', padding: '0.8rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    Headers
                  </button>
                </li>
              </ul>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1 }}>
              {activeTab === 'rate-limit' && (
                <div className="floating-card" style={{ padding: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Global Rate Limit</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Requests per second (RPS)</label>
                      <input type="number" className="neu-pressed" defaultValue={10} style={{ padding: '0.8rem', borderRadius: '8px', border: 'none', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }} />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Burst Capacity</label>
                      <input type="number" className="neu-pressed" defaultValue={20} style={{ padding: '0.8rem', borderRadius: '8px', border: 'none', color: 'var(--text-main)', fontSize: '1rem', outline: 'none' }} />
                    </div>

                    <button className="synth-btn" style={{ marginTop: '1rem' }}>
                      Save Policy
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'auth' && (
                <div className="floating-card" style={{ padding: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Authentication (Coming Soon)</h2>
                  <p style={{ color: 'var(--text-muted)' }}>Enforce JWT, Basic Auth, or OAuth before traffic hits your local server.</p>
                </div>
              )}

              {activeTab === 'headers' && (
                <div className="floating-card" style={{ padding: '2.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Header Injection</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Currently injecting <code>X-ZeroConfig-Forwarded: true</code> into all requests globally.</p>
                  
                  <button className="neu-btn" style={{ padding: '0.8rem 1.5rem' }}>
                    + Add Header Rule
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
