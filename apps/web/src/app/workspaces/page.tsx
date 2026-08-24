"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import "../globals.css";

interface Workspace {
  id: string;
  clientId: string;
  name: string;
}

export default function Workspaces() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/workspaces")
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            setWorkspaces(data);
          } else {
            router.push("/setup");
          }
        });
    }
  }, [status, router]);

  const fetchToken = async () => {
    try {
      const res = await fetch("/api/user/token");
      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const regenerateToken = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/user/token", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.token);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyToken = () => {
    if (authToken) {
      navigator.clipboard.writeText(authToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === "loading") {
    return <div style={{ color: 'var(--text-main)', padding: '2rem', display: 'flex', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100vw', background: 'transparent', color: 'var(--text-main)' }}>
      
      {/* HEADER */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 4rem', 
        borderBottom: 'none',
        background: 'var(--bg-main)',
        boxShadow: 'var(--shadow-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => router.push('/')}>
          <h1 style={{ fontSize: '1.5rem', margin: 0, background: 'linear-gradient(90deg, #1e3a8a, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>ZeroConfig</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{session?.user?.email}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Administrator</span>
          </div>
          
          <button 
            className="neu-flat" 
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: 'none', color: 'var(--text-main)' }}
          >
            <span style={{ fontSize: '1.2rem' }}>👤</span>
          </button>

          {profileMenuOpen && (
            <>
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                onClick={() => setProfileMenuOpen(false)}
              />
              <div className="neu-flat" style={{
                position: 'absolute',
                top: 'calc(100% + 0.5rem)',
                right: 0,
                width: '180px',
                padding: '0.5rem',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <button
                  className="neu-btn"
                  onClick={() => { 
                    setProfileMenuOpen(false); 
                    setTokenModalOpen(true);
                    fetchToken();
                  }}
                  style={{ padding: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
                  Auth Token
                </button>
                <div style={{ height: '1px', background: 'rgba(0,0,0,0.05)', margin: '0.25rem 0' }}></div>
                <button
                  className="neu-btn"
                  onClick={() => signOut()}
                  style={{ padding: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start', color: 'var(--error)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main style={{ 
        flex: 1, 
        padding: '1.5rem 2rem', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        
        {/* HERO SECTION */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          {/* Abstract Glowing Background removed */}
          <h2 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '0.8rem', letterSpacing: '-0.02em' }}>
            Initialize <span style={{ color: 'var(--accent)' }}>Workspace.</span>
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '550px', margin: '0 auto', lineHeight: 1.5 }}>
            Select a swarm Workspace to monitor incoming webhook traffic, synthesize endpoints, and analyze security threats in real-time.
          </p>
        </div>

        {/* WORKSPACES SECTION */}
        <div style={{ padding: '0 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
              Available Workspace
            </h3>
            <button 
              className="neu-btn"
              onClick={() => router.push('/setup')}
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', color: 'var(--accent)' }}
            >
              + Create Workspace
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '3rem 2rem', paddingTop: '1.5rem' }}>
            {workspaces.map((ws, i) => {
              // Generate a consistent but pseudo-random tilt between -4 and +4 degrees based on the workspace ID
              const hash = ws.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const tilt = (hash % 9) - 4; // -4 to +4
              const rotation = tilt === 0 ? '1.5deg' : `${tilt}deg`; // avoid completely flat
              
              const pinColors = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
              const pinColor = pinColors[hash % pinColors.length];
              
              return (
                <div 
                  className="neu-flat"
                  key={ws.id}
                  onClick={() => router.push(`/dashboard?workspaceId=${ws.id}`)}
                  style={{
                    padding: '2rem 1.2rem 1.2rem 1.2rem',
                    cursor: 'pointer',
                    position: 'relative',
                    transform: `rotate(${rotation})`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = `rotate(0deg) scale(1.05) translateY(-5px)`;
                    e.currentTarget.style.zIndex = '10';
                    const btn = e.currentTarget.querySelector('.connect-btn') as HTMLElement;
                    if (btn) {
                      btn.style.background = 'var(--accent)';
                      btn.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = `rotate(${rotation}) scale(1) translateY(0)`;
                    e.currentTarget.style.zIndex = '1';
                    const btn = e.currentTarget.querySelector('.connect-btn') as HTMLElement;
                    if (btn) {
                      btn.style.background = 'transparent';
                      btn.style.color = 'var(--text-main)';
                    }
                  }}
                >
                  {/* 3D Pin */}
                  <div style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, #fff 0%, ${pinColor} 50%, #000 150%)`,
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.3)',
                    zIndex: 2
                  }}>
                    <div style={{ width: '5px', height: '5px', background: 'rgba(255,255,255,0.8)', borderRadius: '50%', position: 'absolute', top: '4px', left: '5px' }}></div>
                  </div>
                  
                  {/* Pin Drop Shadow */}
                  <div style={{
                    position: 'absolute',
                    top: '6px',
                    left: '50%',
                    transform: 'translateX(-40%)',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.15)',
                    filter: 'blur(3px)',
                    zIndex: 1
                  }}></div>

                  {/* Number Watermark */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    fontSize: '2.5rem',
                    fontWeight: 900,
                    color: pinColor,
                    opacity: 0.15,
                    zIndex: 1,
                    lineHeight: 0.8
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  <div className="neu-pressed" style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    color: 'var(--accent)',
                    marginBottom: '0.8rem',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  </div>
                  
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', position: 'relative', zIndex: 2 }}>{ws.name}</h4>
                  
                  <div className="neu-pressed" style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.4rem', 
                    color: 'var(--text-muted)', 
                    fontSize: '0.75rem', 
                    fontFamily: 'var(--font-mono)',
                    padding: '0.4rem 0.8rem',
                    marginBottom: '1.2rem',
                    position: 'relative',
                    zIndex: 2
                  }}>
                    <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--success)' }}></span>
                    ID: {ws.clientId}
                  </div>

                  <div 
                    className="connect-btn neu-btn"
                    style={{ 
                      marginTop: 'auto',
                      width: '100%',
                      padding: '0.8rem', 
                      background: 'transparent', 
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      position: 'relative',
                      zIndex: 2
                    }}
                  >
                    CONNECT &rarr;
                  </div>
                </div>
              );
            })}

            {workspaces.length === 0 && (
              <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: '8px', gridColumn: '1 / -1' }}>
                <p style={{ color: 'var(--text-muted)' }}>No swarm nodes deployed yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* AUTH TOKEN MODAL */}
      {tokenModalOpen && (
        <div
          onClick={() => setTokenModalOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="neu-flat"
            onClick={e => e.stopPropagation()}
            style={{
              padding: '2.5rem',
              maxWidth: '440px',
              width: '100%',
              position: 'relative',
              animation: 'modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div className="neu-pressed" style={{
              width: '56px', height: '56px',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem',
              marginBottom: '1rem',
              color: 'var(--accent)'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              Authentication Token
            </h2>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Use this token to authenticate your local tunnel agent and API requests. Keep it secure!
            </p>

            <div className="neu-pressed" style={{
              padding: '1.2rem',
              marginBottom: '1.5rem',
              width: '100%',
              textAlign: 'left',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <code style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.85rem', 
                color: 'var(--text-main)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {authToken ? authToken : "Loading..."}
              </code>
              <button 
                onClick={handleCopyToken}
                style={{ background: 'none', border: 'none', color: copied ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}
                title="Copy Token"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              <button
                className="neu-btn"
                onClick={() => setTokenModalOpen(false)}
                style={{ flex: 1, padding: '0.8rem', fontSize: '0.9rem' }}
              >
                Done
              </button>
              <button
                className="neu-btn"
                onClick={regenerateToken}
                disabled={isRegenerating}
                style={{ flex: 1, padding: '0.8rem', fontSize: '0.9rem', color: 'var(--error)' }}
              >
                {isRegenerating ? "Revoking..." : "Revoke & Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
