"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import "../globals.css";
import { generateTypeScriptInterface, generateNextRouteHandler } from "../../utils/synthesizer";

interface TrafficLog {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  reqHeaders: Record<string, string[]>;
  reqBodyBase64: string;
  status: number;
  respHeaders: Record<string, string[]>;
  respBodyBase64: string;
  durationMs: number;
}

interface Workspace {
  id: string;
  clientId: string;
  name: string;
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspaceId');
  const { data: session, status } = useSession();
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  const [logs, setLogs] = useState<TrafficLog[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  
  const [showCode, setShowCode] = useState(false);
  const [isBrowserAgentActive, setIsBrowserAgentActive] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [browserAgentPort, setBrowserAgentPort] = useState("3000");
  const [agentLatency, setAgentLatency] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Delete workspace modal state
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; workspace: Workspace | null }>({
    open: false,
    workspace: null
  });
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

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
            if (workspaceId) {
              const ws = data.find((w: Workspace) => w.id === workspaceId);
              if (ws) {
                setActiveWorkspace(ws);
              } else {
                router.push("/workspaces");
              }
            } else {
              router.push("/workspaces");
            }
          } else {
            router.push("/setup");
          }
        });
    }
  }, [status, router, workspaceId]);



  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openDeleteModal = (ws: Workspace) => {
    setDeleteModal({ open: true, workspace: ws });
    setDeleteConfirmInput("");
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, workspace: null });
    setDeleteConfirmInput("");
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteModal.workspace) return;
    if (deleteConfirmInput !== deleteModal.workspace.clientId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workspaces?id=${deleteModal.workspace.id}`, { method: 'DELETE' });
      if (res.ok) {
        closeDeleteModal();
        router.push('/workspaces');
      }
    } catch (e) {
      console.error('Delete failed', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const proxyBase = process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:8080';
  const proxyWsBase = proxyBase.startsWith('https://')
    ? proxyBase.replace(/^https:\/\//, 'wss://')
    : proxyBase.replace(/^http:\/\//, 'ws://');

  const getWorkspaceProxyUrl = (clientId?: string) => {
    if (!clientId) return '';
    try {
      const url = new URL(proxyBase);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return `${url.protocol}//${clientId}.${url.host}`;
      }
      return `${proxyBase}?clientId=${clientId}`;
    } catch {
      return `http://${clientId}.localhost:8080`;
    }
  };

  useEffect(() => {
    if (!activeWorkspace) return;
    const targetToken = activeWorkspace.clientId || activeWorkspace.id;

    fetch(`${proxyBase}/_api/status?token=${targetToken}`)
      .then(async r => {
        if (r.status === 401) return setIsOnline(false);
        const d = await r.json();
        setIsOnline(d.online);
      })
      .catch(() => setIsOnline(false));

    fetch(`${proxyBase}/_api/logs?token=${targetToken}`)
      .then(r => r.json())
      .then((data: TrafficLog[]) => setLogs(data || []))
      .catch(console.error);

    const es = new EventSource(`${proxyBase}/_api/logs/stream?token=${targetToken}`);
    es.onmessage = (event) => {
      try {
        const newLog = JSON.parse(event.data);
        setLogs(prev => {
          if (prev.some(l => l.id === newLog.id)) return prev;
          return [newLog, ...prev];
        });
      } catch (e) {
        console.error("SSE parse error", e);
      }
    };
    es.onerror = () => setIsOnline(false);
    es.onopen = () => setIsOnline(true);

    return () => es.close();
  }, [activeWorkspace?.id, activeWorkspace?.clientId, proxyBase]);

  useEffect(() => {
    if (!isBrowserAgentActive || !activeWorkspace) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setTimeout(() => setAgentLatency(null), 0);
      return;
    }

    const targetToken = activeWorkspace.clientId || activeWorkspace.id;
    const ws = new WebSocket(`${proxyWsBase}/_ws?token=${targetToken}`);
    wsRef.current = ws;

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== 'request') return;

        const reqStart = Date.now();

        const fetchHeaders: HeadersInit = {};
        if (msg.headers) {
          for (const [key, value] of Object.entries(msg.headers)) {
            const lk = key.toLowerCase();
            if (lk !== 'host' && lk !== 'connection' && lk !== 'accept-encoding') {
              fetchHeaders[key] = (value as string[]).join(", ");
            }
          }
        }

        let fetchBody: Blob | undefined = undefined;
        if (msg.body) {
          const byteCharacters = atob(msg.body);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          fetchBody = new Blob([new Uint8Array(byteNumbers)]);
        }

        const targetUrl = `http://localhost:${browserAgentPort}${msg.path}`;
        
        try {
          const res = await fetch(targetUrl, {
            method: msg.method,
            headers: fetchHeaders,
            body: (msg.method === 'GET' || msg.method === 'HEAD') ? undefined : fetchBody,
          });

          const arrayBuffer = await res.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const len = bytes.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Body = btoa(binary);

          const respHeaders: Record<string, string[]> = {};
          res.headers.forEach((value, key) => {
            const lk = key.toLowerCase();
            if (lk !== 'content-encoding' && lk !== 'content-length' && lk !== 'transfer-encoding') {
              respHeaders[key] = [value];
            }
          });

          ws.send(JSON.stringify({
            type: 'response',
            requestId: msg.requestId,
            status: res.status,
            headers: respHeaders,
            body: base64Body
          }));

          setAgentLatency(Date.now() - reqStart);

        } catch (fetchErr: any) {
          ws.send(JSON.stringify({
            type: 'response',
            requestId: msg.requestId,
            status: 502,
            headers: { 'Content-Type': ['text/plain'] },
            body: btoa("502 Bad Gateway - Browser Agent failed to fetch")
          }));
          setAgentLatency(Date.now() - reqStart);
        }
      } catch (e) {
        console.error("Browser Agent generic error", e);
      }
    };

    return () => ws.close();
  }, [isBrowserAgentActive, browserAgentPort, activeWorkspace?.id]);

  const handleReplay = async () => {
    if (!selectedId || !activeWorkspace?.id) return;
    try {
      await fetch(`${proxyBase}/_api/replay?token=${activeWorkspace.id}&logId=${selectedId}`, { method: 'POST' });
    } catch (e) {
      console.error("Replay error", e);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(l => 
      l.path.toLowerCase().includes(search.toLowerCase()) ||
      l.method.toLowerCase().includes(search.toLowerCase())
    );
  }, [logs, search]);

  useEffect(() => {
    setShowCode(false);
  }, [selectedId]);

  const selectedLog = useMemo(() => {
    return logs.find(l => l.id === selectedId) || null;
  }, [logs, selectedId]);

  const decodeBase64JSON = (b64: string) => {
    if (!b64) return "";
    try {
      return JSON.stringify(JSON.parse(atob(b64)), null, 2);
    } catch (e) {
      try { return atob(b64); } catch (e2) { return "Unreadable payload"; }
    }
  };

  const generatedCode = useMemo(() => {
    if (!selectedLog || !selectedLog.reqBodyBase64 || !showCode) return "";
    try {
      const jsonStr = atob(selectedLog.reqBodyBase64);
      JSON.parse(jsonStr); 
      const tsInterface = generateTypeScriptInterface(jsonStr, "WebhookPayload");
      return generateNextRouteHandler(tsInterface, "WebhookPayload");
    } catch (e) {
      return "// Payload is not valid JSON. Cannot synthesize code.";
    }
  }, [selectedLog, showCode]);

  if (status === "loading") return <div style={{ color: 'var(--text-main)', padding: '2rem' }}>Loading...</div>;

  return (
    <div className="layout">
      <div className="app-window">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="app-sidebar">
          {/* Logo Icon */}
          <div className="logo" style={{ cursor: 'pointer', marginBottom: '2rem' }} onClick={() => router.push('/')}>
            <div className="neu-flat" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 800, fontSize: '1.2rem' }}>
              Z
            </div>
          </div>
          
          <button className="sidebar-icon active">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
            <span>Live View</span>
          </button>
          
          <button className="sidebar-icon" onClick={() => router.push('/workspaces')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Workspaces</span>
          </button>

          <button className="sidebar-icon" onClick={() => router.push('/setup')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>Settings</span>
          </button>
        </aside>

        {/* ── MAIN INNER CANVAS ── */}
        <div className="app-main-wrapper">
          {/* HEADER */}
          <header className="app-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Live Traffic View</h1>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="search-bar" style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="Filter logs..." 
                  className="neu-pressed"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ width: '220px' }}
                />
              </div>

              {workspaces.length > 0 && (
                <select 
                  className="neu-flat"
                  value={activeWorkspace?.id || ""} 
                  onChange={e => {
                    const ws = workspaces.find(w => w.id === e.target.value);
                    if (ws) {
                      router.push(`/dashboard?workspaceId=${ws.id}`);
                    }
                  }}
                  style={{ 
                    padding: '0.6rem 1rem', 
                    borderRadius: '999px', 
                    color: 'var(--text-main)', 
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
              
              <div style={{ position: 'relative' }}>
                <button 
                  className="neu-btn"
                  onClick={() => setSettingsMenuOpen(!settingsMenuOpen)} 
                  style={{ 
                    width: '40px', height: '40px', 
                    borderRadius: '50%', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-main)'
                  }}
                  title="Workspace Settings"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>

                {settingsMenuOpen && (
                  <>
                    <div 
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
                      onClick={() => setSettingsMenuOpen(false)}
                    />
                    <div className="neu-flat" style={{
                      position: 'absolute',
                      top: 'calc(100% + 0.5rem)',
                      right: 0,
                      width: '220px',
                      padding: '0.5rem',
                      zIndex: 50,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <button
                        className="neu-btn"
                        onClick={() => { setSettingsMenuOpen(false); router.push('/dashboard/policies'); }}
                        style={{ padding: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Traffic Policies
                      </button>
                      <button
                        className="neu-btn"
                        onClick={() => { setSettingsMenuOpen(false); router.push('/dashboard/ai-gateway'); }}
                        style={{ padding: '0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-start' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        AI Gateway Config
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              <button 
                className="neu-btn"
                onClick={() => signOut()} 
                style={{ 
                  width: '40px', height: '40px', 
                  borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
                title="Sign Out"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </header>

          {/* CONTENT GRID */}
          <div style={{ display: 'flex', flex: 1, padding: '0 2.5rem 2.5rem 2.5rem', gap: '2rem', overflow: 'hidden' }}>
            
            {/* FLOATING CARD 1: Traffic Logs List */}
            <div className="floating-card" style={{ width: '320px', display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
              <div className="floating-card-header" style={{ padding: '0 0.5rem', marginBottom: '0.5rem' }}>
                <div>
                  <h3 className="floating-card-title">Traffic Logs</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filteredLogs.length} Requests</span>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                </button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.2rem' }}>
                {filteredLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.9rem' }}>No requests yet.</div>
                ) : (
                  filteredLogs.map(log => (
                    <div 
                      key={log.id} 
                      className={`log-item ${selectedId === log.id ? 'active' : ''}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                      onClick={() => setSelectedId(log.id)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`method ${log.method}`} style={{ fontSize: '0.7rem' }}>{log.method}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: log.status >= 400 ? 'var(--error)' : 'var(--success)' }}>{log.status}</span>
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                        {log.path}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span>{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                        <span>{log.durationMs}ms</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* MAIN CENTRAL AREA: Request Details */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: 'transparent' }}>
              {!selectedLog ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  <div className="waiting-pulse" style={(!isOnline && !isBrowserAgentActive) ? { animation: 'none', background: 'var(--text-muted)', boxShadow: 'none' } : {}}></div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                    {(!isOnline && !isBrowserAgentActive) ? 'Agent Stopped' : 'Listening for webhooks...'}
                  </h2>
                  {(!isOnline && !isBrowserAgentActive) && <p style={{ fontSize: '0.95rem' }}>Toggle the Browser Agent on the right to start.</p>}
                </div>
              ) : (
                <div className="detail-content" style={{ maxWidth: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{selectedLog.method} {selectedLog.path}</h2>
                      <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <span style={{ color: selectedLog.status >= 400 ? 'var(--error)' : 'var(--success)' }}>{selectedLog.status}</span>
                        <span>•</span>
                        <span>{selectedLog.durationMs}ms</span>
                        <span>•</span>
                        <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    <button 
                      className="neu-btn"
                      onClick={handleReplay}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                        padding: '0.6rem 1.2rem',
                        color: 'var(--accent)'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>
                      Replay
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="floating-card" style={{ padding: '2rem' }}>
                      <div className="floating-card-header">
                        <h3 className="floating-card-title">Request</h3>
                        {selectedLog.reqBodyBase64 && (
                          <button 
                            className="synth-btn" 
                            onClick={() => setShowCode(!showCode)}
                          >
                            {showCode ? "View Raw JSON" : "✨ Synthesize Code"}
                          </button>
                        )}
                      </div>
                      
                      {showCode ? (
                        <div className="section">
                          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>Synthesized Next.js Route</h4>
                          <pre className="code-block json">
                            {generatedCode}
                          </pre>
                        </div>
                      ) : (
                        <>
                          <div className="section" style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>Headers</h4>
                            <pre className="code-block">
                              {Object.entries(selectedLog.reqHeaders || {}).map(([k, v]) => (
                                <div key={k}><strong style={{ color: 'var(--text-muted)' }}>{k}:</strong> {v.join(", ")}</div>
                              ))}
                            </pre>
                          </div>
                          {selectedLog.reqBodyBase64 && (
                            <div className="section">
                              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>Body</h4>
                              <pre className="code-block json">
                                {decodeBase64JSON(selectedLog.reqBodyBase64)}
                              </pre>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="floating-card" style={{ padding: '2rem' }}>
                      <h3 className="floating-card-title" style={{ marginBottom: '1rem' }}>Response</h3>
                      <div className="section" style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>Headers</h4>
                        <pre className="code-block">
                          {Object.entries(selectedLog.respHeaders || {}).map(([k, v]) => (
                            <div key={k}><strong style={{ color: 'var(--text-muted)' }}>{k}:</strong> {v.join(", ")}</div>
                          ))}
                        </pre>
                      </div>
                      {selectedLog.respBodyBase64 && (
                        <div className="section">
                          <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>Body</h4>
                          <pre className="code-block json">
                            {decodeBase64JSON(selectedLog.respBodyBase64)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FLOATING CARDS: Right side controls */}
            <div className="right-sidebar-scroll" style={{ width: '310px', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', padding: '1rem', margin: '-1rem', paddingRight: '1rem' }}>
               
               {/* Browser Agent Card */}
               <div className="floating-card">
                 <div className="floating-card-header">
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <h3 className="floating-card-title" style={{ fontSize: '1rem' }}>Browser Agent</h3>
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Local Forwarding</span>
                   </div>
                   <label className="toggle-switch">
                     <input 
                       type="checkbox" 
                       checked={isBrowserAgentActive} 
                       onChange={() => activeWorkspace?.id && setIsBrowserAgentActive(!isBrowserAgentActive)}
                       disabled={!activeWorkspace?.id}
                     />
                     <span className="toggle-slider"></span>
                   </label>
                 </div>
                 
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                   <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Target Port</span>
                   <input 
                     type="text" 
                     className="neu-pressed"
                     value={browserAgentPort} 
                     onChange={e => setBrowserAgentPort(e.target.value)}
                     disabled={isBrowserAgentActive}
                     style={{ 
                       width: '60px', padding: '0.4rem', 
                       borderRadius: '8px',
                       textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-mono)',
                       color: 'var(--text-main)',
                       border: 'none',
                       outline: 'none'
                     }}
                   />
                 </div>
               </div>

               {/* Connection Status Card */}
               <div className="floating-card">
                 <div className="floating-card-header">
                   <h3 className="floating-card-title" style={{ fontSize: '1rem' }}>Connection</h3>
                   <span className={`badge ${isBrowserAgentActive ? 'online' : (isOnline ? 'online' : 'offline')}`}>
                     {isBrowserAgentActive ? 'Active' : (isOnline ? 'CLI' : 'Offline')}
                   </span>
                 </div>
                 
                 <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                   <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Workspace ID</span>
                   <div 
                     className="pill-block"
                     style={{ 
                       display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                       cursor: 'pointer',
                       overflow: 'hidden'
                     }}
                     onClick={() => activeWorkspace && handleCopy(activeWorkspace.id, 'token')}
                   >
                     <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                       {activeWorkspace ? activeWorkspace.id : 'Loading...'}
                     </code>
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={copiedId === 'token' ? "var(--success)" : "var(--text-muted)"} strokeWidth="2" style={{ flexShrink: 0, marginLeft: '8px' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                   </div>
                 </div>
               </div>

               {/* Workspace Settings Card */}
               <div className="floating-card">
                 <div className="floating-card-header" style={{ marginBottom: '1.5rem' }}>
                   <h3 className="floating-card-title" style={{ fontSize: '1rem' }}>Workspace</h3>
                   <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                   </button>
                 </div>
                 
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Proxy URL</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        className="pill-block"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          overflow: 'hidden',
                          minWidth: 0,
                          padding: '0.5rem 0.75rem',
                        }}
                      >
                        <code style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem',
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                          width: '100%',
                        }}>
                          {getWorkspaceProxyUrl(activeWorkspace?.clientId)}
                        </code>
                      </div>
                      {/* Copy button */}
                      <button
                        title="Copy URL"
                        onClick={() => handleCopy(getWorkspaceProxyUrl(activeWorkspace?.clientId), 'url')}
                        style={{
                          flexShrink: 0,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          color: copiedId === 'url' ? 'var(--success)' : 'var(--text-muted)',
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.2s',
                        }}
                      >
                        {copiedId === 'url' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        )}
                      </button>
                      {/* Open in new tab button */}
                      <button
                        title="Open in new tab"
                        onClick={() => window.open(getWorkspaceProxyUrl(activeWorkspace?.clientId), '_blank')}
                        style={{
                          flexShrink: 0,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center',
                          transition: 'color 0.2s',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                      </button>
                    </div>
                  </div>

                 {activeWorkspace && (
                   <button
                     className="neu-btn"
                     onClick={() => openDeleteModal(activeWorkspace)}
                     style={{
                       width: '100%',
                       padding: '0.8rem',
                       color: 'var(--error)',
                       fontSize: '0.85rem',
                       display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                     }}
                   >
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                     Delete Workspace
                   </button>
                 )}
               </div>

            </div>
          </div>
        </div>
      </div>

      {/* ── DELETE WORKSPACE MODAL ── */}
      {deleteModal.open && deleteModal.workspace && (
        <div
          onClick={closeDeleteModal}
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
            {/* 3D Pin (Blue theme) */}
            <div style={{
              position: 'absolute',
              top: '-15px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: `radial-gradient(circle at 35% 35%, #fff 0%, #3b82f6 50%, #000 150%)`,
              boxShadow: '0 5px 12px rgba(0,0,0,0.3), inset 0 -2px 6px rgba(0,0,0,0.3)',
              zIndex: 2
            }}>
              <div style={{ width: '6px', height: '6px', background: 'rgba(255,255,255,0.8)', borderRadius: '50%', position: 'absolute', top: '5px', left: '6px' }}></div>
            </div>
            
            {/* Pin Drop Shadow */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-40%)',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.15)',
              filter: 'blur(3px)',
              zIndex: 1
            }}></div>

            <div className="neu-pressed" style={{
              width: '56px', height: '56px',
              borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem',
              marginBottom: '1rem',
              color: 'var(--accent)'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </div>

            <h2 style={{
              fontSize: '1.4rem', fontWeight: 800,
              color: 'var(--text-main)',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              Delete Workspace
            </h2>

            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.95rem',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
              maxWidth: '90%'
            }}>
              This will <strong style={{ color: '#dc2626' }}>permanently delete</strong> the{' '}
              <code style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(0,0,0,0.05)',
                borderRadius: '4px',
                padding: '0.1rem 0.4rem',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-main)'
              }}>{deleteModal.workspace.name}</code>{' '}
              workspace. This action <strong>cannot be undone</strong>.
            </p>

            {/* Confirmation input */}
            <div className="neu-pressed" style={{
              padding: '1.5rem',
              marginBottom: '1.5rem',
              width: '100%',
              textAlign: 'left',
              borderRadius: '16px'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '0.6rem'
              }}>
                Type{' '}
                <code style={{
                  fontFamily: 'var(--font-mono)',
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.05)',
                  borderRadius: '4px',
                  padding: '0.1rem 0.4rem',
                  color: 'var(--text-main)',
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}>{deleteModal.workspace.clientId}</code>{' '}
                to confirm
              </label>
              <input
                type="text"
                className="neu-pressed"
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
                placeholder={deleteModal.workspace.clientId}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && deleteConfirmInput === deleteModal.workspace!.clientId) {
                    handleDeleteWorkspace();
                  }
                  if (e.key === 'Escape') closeDeleteModal();
                }}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  color: 'var(--text-main)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  border: 'none',
                  boxShadow: deleteConfirmInput === deleteModal.workspace.clientId ? 'inset 2px 2px 5px var(--neu-dark), inset -2px -2px 5px var(--neu-light), 0 0 0 2px var(--error)' : 'var(--shadow-pressed)'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button
                className="neu-btn"
                onClick={closeDeleteModal}
                style={{
                  flex: 1,
                  padding: '1rem',
                  fontSize: '0.95rem'
                }}
              >
                Cancel
              </button>
              <button
                className="neu-btn"
                onClick={handleDeleteWorkspace}
                disabled={deleteConfirmInput !== deleteModal.workspace.clientId || isDeleting}
                style={{
                  flex: 1,
                  padding: '1rem',
                  color: deleteConfirmInput === deleteModal.workspace.clientId ? 'var(--error)' : 'var(--text-muted)',
                  fontSize: '0.95rem',
                  cursor: deleteConfirmInput === deleteModal.workspace.clientId ? 'pointer' : 'not-allowed',
                }}
              >
                {isDeleting ? 'Deleting...' : '🗑 Delete'}
              </button>
            </div>

            {/* Close X */}
            <button
              onClick={closeDeleteModal}
              style={{
                position: 'absolute', top: '1.2rem', right: '1.2rem',
                background: 'none', border: 'none',
                fontSize: '1.2rem', cursor: 'pointer',
                color: 'var(--text-muted)',
                width: '32px', height: '32px',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>Loading ZeroConfig Dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
