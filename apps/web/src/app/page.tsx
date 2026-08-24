"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import "./landing.css";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleProtectedNavigate = (targetPath: string) => {
    if (session) {
      router.push(targetPath);
    } else {
      router.push('/auth/signin');
    }
  };

  return (
    <div className="neu-landing-wrapper">
      {/* Neumorphic Navigation Bar */}
      <header className="neu-navbar">
        <div className="neu-container neu-navbar-inner">
          <Link href="/" className="neu-brand">
            <div className="neu-brand-icon">⚡</div>
            <span className="neu-brand-title">ZeroConfig</span>
            <span className="neu-brand-badge">OSS</span>
          </Link>

          <nav>
            <ul className="neu-nav-links">
              <li><a href="#modules" className="neu-nav-link">Platform Modules</a></li>
              <li><a href="#features" className="neu-nav-link">Features</a></li>
              <li><a href="#comparison" className="neu-nav-link">vs Ngrok</a></li>
              <li><a href="#architecture" className="neu-nav-link">Architecture</a></li>
              <li><a href="#faq" className="neu-nav-link">FAQ</a></li>
            </ul>
          </nav>

          <div className="neu-nav-actions">
            <div className="neu-status-pill">
              <span className="neu-status-dot" />
              <span>Proxy :8080 Active</span>
            </div>

            {session ? (
              <button 
                onClick={() => router.push('/dashboard')} 
                className="neu-btn-action neu-btn-primary-action"
              >
                Dashboard →
              </button>
            ) : (
              <>
                <button 
                  onClick={() => router.push('/auth/signin')} 
                  className="neu-btn-action neu-btn-ghost-action"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => router.push('/auth/signin')} 
                  className="neu-btn-action neu-btn-primary-action"
                >
                  Get Started →
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="neu-container">
        <section className="neu-hero">
          <div className="neu-hero-badge">
            <span className="neu-badge-tag">Open Source</span>
            <span>ZeroConfig 2.0 • Local Tunnel & Webhook Platform</span>
          </div>

          <h1 className="neu-hero-title">
            Secure Local Ingress & Webhook Studio <br />
            <span className="neu-gradient-span">Built for Real Development.</span>
          </h1>

          <p className="neu-hero-desc">
            Expose local servers to the internet via high-speed WebSockets. Live-stream incoming HTTP requests with Server-Sent Events, auto-generate TypeScript interfaces, replay webhooks with 1 click, and tunnel traffic with zero friction.
          </p>

          <div className="neu-hero-ctas">
            <button 
              onClick={() => handleProtectedNavigate('/dashboard')} 
              className="neu-btn-action neu-btn-primary-action"
              style={{ padding: '0.95rem 2.8rem', fontSize: '1.05rem' }}
            >
              {session ? "Open Dashboard →" : "Get Started Free →"}
            </button>
          </div>
        </section>

        {/* Real App Working Modules Spotlight */}
        <section id="modules" style={{ margin: '2rem 0 5rem' }}>
          <div className="neu-section-heading" style={{ marginBottom: '2.5rem' }}>
            <span className="neu-section-badge">Platform Modules</span>
            <h2 className="neu-section-title">Core Modules in ZeroConfig</h2>
            <p className="neu-section-desc">
              All tools run locally on your machine with high-speed WebSockets and real-time observability.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.75rem' }}>
            {/* Module 1: Live Studio */}
            <div className="neu-stat-card" style={{ textAlign: 'left', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--neu-accent)' }}>
                📡
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neu-text-main)', marginBottom: '0.5rem' }}>Live Traffic Inspector</h3>
              <p style={{ color: 'var(--neu-text-muted)', fontSize: '0.925rem', lineHeight: 1.6, flex: 1, marginBottom: '1.5rem' }}>
                Real-time Server-Sent Events (SSE) stream on port 8080. Inspect request/response headers, base64 payload bytes, JSON body, and latencies.
              </p>
              <button onClick={() => handleProtectedNavigate('/dashboard')} className="neu-btn-action" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', width: 'fit-content' }}>
                Open Live Studio →
              </button>
            </div>

            {/* Module 2: 1-Click Replay */}
            <div className="neu-stat-card" style={{ textAlign: 'left', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--neu-purple)' }}>
                🔁
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neu-text-main)', marginBottom: '0.5rem' }}>1-Click Webhook Replay</h3>
              <p style={{ color: 'var(--neu-text-muted)', fontSize: '0.925rem', lineHeight: 1.6, flex: 1, marginBottom: '1.5rem' }}>
                Re-dispatch any intercepted request via <code style={{ color: 'var(--neu-purple)' }}>/_api/replay</code> directly to your local endpoint without triggering external services.
              </p>
              <button onClick={() => handleProtectedNavigate('/dashboard')} className="neu-btn-action" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', width: 'fit-content' }}>
                Explore Webhook Replay →
              </button>
            </div>

            {/* Module 3: AI Gateway */}
            <div className="neu-stat-card" style={{ textAlign: 'left', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--neu-amber)' }}>
                🤖
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neu-text-main)', marginBottom: '0.5rem' }}>AI Gateway Observability</h3>
              <p style={{ color: 'var(--neu-text-muted)', fontSize: '0.925rem', lineHeight: 1.6, flex: 1, marginBottom: '1.5rem' }}>
                Automatic token estimation for LLM chat completions and generation requests passing through the tunnel.
              </p>
              <button onClick={() => handleProtectedNavigate('/dashboard/ai-gateway')} className="neu-btn-action" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', width: 'fit-content' }}>
                View AI Gateway →
              </button>
            </div>

            {/* Module 4: Traffic Policies */}
            <div className="neu-stat-card" style={{ textAlign: 'left', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--neu-bg)', boxShadow: 'var(--neu-shadow-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1.25rem', color: 'var(--neu-success)' }}>
                🛡️
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--neu-text-main)', marginBottom: '0.5rem' }}>Traffic Policies</h3>
              <p style={{ color: 'var(--neu-text-muted)', fontSize: '0.925rem', lineHeight: 1.6, flex: 1, marginBottom: '1.5rem' }}>
                Token-bucket rate limiting (10 req/s, burst 20) and automatic <code style={{ color: 'var(--neu-accent)' }}>X-ZeroConfig-Forwarded</code> header injection.
              </p>
              <button onClick={() => handleProtectedNavigate('/dashboard/policies')} className="neu-btn-action" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', width: 'fit-content' }}>
                Configure Policies →
              </button>
            </div>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="neu-stats-grid">
          <div className="neu-stat-card">
            <div className="neu-stat-number">100<span style={{ color: 'var(--neu-success)' }}>%</span></div>
            <div className="neu-stat-label">Data Sovereignty & Local Privacy</div>
          </div>
          <div className="neu-stat-card">
            <div className="neu-stat-number">∞</div >
            <div className="neu-stat-label">Free Custom Workspace Subdomains</div>
          </div>
          <div className="neu-stat-card">
            <div className="neu-stat-number">0<span style={{ color: 'var(--neu-accent)' }}>-CLI</span></div>
            <div className="neu-stat-label">Browser-First Agent Support</div>
          </div>
          <div className="neu-stat-card">
            <div className="neu-stat-number">1<span style={{ color: 'var(--neu-purple)' }}>-Click</span></div>
            <div className="neu-stat-label">Instant Webhook Replay & Synthesis</div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" style={{ paddingTop: '1rem' }}>
          <div className="neu-section-heading">
            <span className="neu-section-badge">Implemented Capabilities</span>
            <h2 className="neu-section-title">Built for Real Webhook Testing & Development</h2>
            <p className="neu-section-desc">
              Every feature listed below is fully implemented in this repository across the Go Proxy engine, Node.js CLI agent, and Next.js Studio dashboard.
            </p>
          </div>

          <div className="neu-features-grid">
            <div className="neu-feature-box">
              <div className="neu-feature-icon-wrapper">🌐</div>
              <h3 className="neu-feature-title">WebSocket Tunnel Engine</h3>
              <p className="neu-feature-p">
                Go Proxy running on port 8080 translates incoming HTTP requests into WebSocket messages, forwards them to your local agent, and ships responses back synchronously.
              </p>
            </div>

            <div className="neu-feature-box neu-feat-purple">
              <div className="neu-feature-icon-wrapper">🔍</div>
              <h3 className="neu-feature-title">Live Traffic Inspector</h3>
              <p className="neu-feature-p">
                Real-time Server-Sent Events (SSE) stream incoming requests directly to the split-pane dashboard. Inspect raw query params, request headers, JSON payloads, and response status codes.
              </p>
            </div>

            <div className="neu-feature-box neu-feat-green">
              <div className="neu-feature-icon-wrapper">🔁</div>
              <h3 className="neu-feature-title">1-Click Webhook Replay</h3>
              <p className="neu-feature-p">
                Powered by the <code style={{ color: 'var(--neu-accent)' }}>/_api/replay</code> endpoint. Re-send any previously received webhook from the dashboard directly to your local dev server without re-triggering external services.
              </p>
            </div>

            <div className="neu-feature-box neu-feat-amber">
              <div className="neu-feature-icon-wrapper">🤖</div>
              <h3 className="neu-feature-title">AI Gateway Observability</h3>
              <p className="neu-feature-p">
                Inspect AI LLM completions. The Go proxy and dashboard detect <code style={{ color: 'var(--neu-amber)' }}>/v1/chat/completions</code> requests to calculate prompt and completion token counts and track response durations.
              </p>
            </div>

            <div className="neu-feature-box">
              <div className="neu-feature-icon-wrapper">⚡</div>
              <h3 className="neu-feature-title">TypeScript & Route Synthesizer</h3>
              <p className="neu-feature-p">
                Instant synthesizer utility parses intercepted JSON payloads and generates strict TypeScript interfaces and ready-to-use Next.js <code style={{ color: 'var(--neu-accent)' }}>POST()</code> route handlers.
              </p>
            </div>

            <div className="neu-feature-box neu-feat-green">
              <div className="neu-feature-icon-wrapper">🛡️</div>
              <h3 className="neu-feature-title">Traffic Policies & Swarm Balancing</h3>
              <p className="neu-feature-p">
                Built-in token-bucket rate limiting (10 req/s, burst 20), automated <code style={{ color: 'var(--neu-accent)' }}>X-ZeroConfig-Forwarded</code> header injection, and round-robin load-balancing across multi-port swarms.
              </p>
            </div>
          </div>
        </section>

        {/* Side-by-Side Comparison: ZeroConfig vs Ngrok */}
        <section id="comparison">
          <div className="neu-section-heading">
            <span className="neu-section-badge">Direct Comparison</span>
            <h2 className="neu-section-title">ZeroConfig vs. Ngrok</h2>
            <p className="neu-section-desc">
              How ZeroConfig compares with traditional tunnel services for local webhook debugging and ingress.
            </p>
          </div>

          <div className="neu-comparison-card">
            <table className="neu-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Capability</th>
                  <th className="highlight" style={{ width: '30%' }}>⚡ ZeroConfig (This App)</th>
                  <th style={{ width: '30%' }}>Ngrok</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="feature-name">Self-Hosted & Private</td>
                  <td className="highlight"><span className="neu-check-yes">✓ 100% Local Go Proxy + SQLite</span></td>
                  <td><span className="neu-check-no">✗ Traffic routes through Ngrok servers</span></td>
                </tr>
                <tr>
                  <td className="feature-name">Custom Workspace Subdomains</td>
                  <td className="highlight"><span className="neu-check-yes">✓ Unlimited Workspace IDs</span></td>
                  <td><span className="neu-check-no">✗ Requires Paid Plan</span></td>
                </tr>
                <tr>
                  <td className="feature-name">Visual Webhook Studio & Replay</td>
                  <td className="highlight"><span className="neu-check-yes">✓ Split-Pane UI + 1-Click Replay</span></td>
                  <td>Basic localhost:4040 web UI</td>
                </tr>
                <tr>
                  <td className="feature-name">Automated TypeScript Generation</td>
                  <td className="highlight"><span className="neu-check-yes">✓ Built-in Synthesizer</span></td>
                  <td><span className="neu-check-no">✗ Not Available</span></td>
                </tr>
                <tr>
                  <td className="feature-name">Browser-First Agent (No CLI)</td>
                  <td className="highlight"><span className="neu-check-yes">✓ In-Browser WebSocket Agent</span></td>
                  <td><span className="neu-check-no">✗ Requires CLI Binary</span></td>
                </tr>
                <tr>
                  <td className="feature-name">AI Token & LLM Gateway Tracking</td>
                  <td className="highlight"><span className="neu-check-yes">✓ Built-in Token Observability</span></td>
                  <td><span className="neu-check-no">✗ Separate paid tooling</span></td>
                </tr>
                <tr>
                  <td className="feature-name">Multi-Port Swarm Load Balancing</td>
                  <td className="highlight"><span className="neu-check-yes">✓ Round-Robin (<code style={{ fontSize: '0.8rem' }}>--port 3000,3001</code>)</span></td>
                  <td><span className="neu-check-no">✗ Complex multi-tunnel configs</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Real Architecture Steps */}
        <section id="architecture">
          <div className="neu-section-heading">
            <span className="neu-section-badge">How It Works</span>
            <h2 className="neu-section-title">ZeroConfig Tunnel Architecture</h2>
            <p className="neu-section-desc">
              Understand the exact flow of data through the ZeroConfig stack.
            </p>
          </div>

          <div className="neu-arch-grid">
            <div className="neu-arch-card">
              <div className="neu-step-circle">01</div>
              <h3 className="neu-step-title">Go Proxy Ingress (:8080)</h3>
              <p className="neu-step-desc">
                The Go Proxy receives external HTTP requests, extracts the target workspace ID from the subdomain or <code style={{ color: 'var(--neu-accent)' }}>x-client-id</code> header, applies rate-limiting, and injects <code style={{ color: 'var(--neu-accent)' }}>X-ZeroConfig-Forwarded</code>.
              </p>
            </div>

            <div className="neu-arch-card">
              <div className="neu-step-circle">02</div>
              <h3 className="neu-step-title">WebSocket Forwarding</h3>
              <p className="neu-step-desc">
                The proxy dispatches the request over an authenticated WebSocket connection (<code style={{ color: 'var(--neu-accent)' }}>/_ws?token=...</code>) to the local CLI agent or Browser Agent running on your machine.
              </p>
            </div>

            <div className="neu-arch-card">
              <div className="neu-step-circle">03</div>
              <h3 className="neu-step-title">Local Execution & SSE Broadcast</h3>
              <p className="neu-step-desc">
                Your local server executes the request, returns the response bytes up the tunnel, and the Go Proxy broadcasts the full log to your Next.js dashboard via Server-Sent Events.
              </p>
            </div>
          </div>
        </section>

        {/* Real FAQ Accordion */}
        <section id="faq">
          <div className="neu-section-heading">
            <span className="neu-section-badge">Frequently Asked Questions</span>
            <h2 className="neu-section-title">ZeroConfig Details & Usage</h2>
            <p className="neu-section-desc">
              Direct, accurate answers about how ZeroConfig functions.
            </p>
          </div>

          <div className="neu-faq-stack">
            {[
              {
                q: "How do I get started with ZeroConfig?",
                a: "Simply click Get Started to sign in, create a workspace to receive your auth token, and start tunneling your local servers via the CLI or the in-browser agent."
              },
              {
                q: "What services are included in this ZeroConfig installation?",
                a: "ZeroConfig consists of 3 components: 1) The Go Proxy server on port 8080 (handling WebSockets, rate limiting, and SSE), 2) The Next.js Studio Dashboard on port 3000 (with live traffic inspector, workspaces, and AI gateway), and 3) The Node.js CLI agent in packages/cli."
              },
              {
                q: "How do I get an authentication token to run the CLI?",
                a: "Sign in to the web app, navigate to /workspaces or /setup to create a workspace, and copy your generated workspace token from the top bar or workspace settings."
              },
              {
                q: "How does the 1-Click Webhook Replay work?",
                a: "The Go proxy caches the last 100 requests in memory. When you click 'Replay Webhook' in the dashboard, a POST call is made to /_api/replay?token=...&logId=..., which re-dispatches the exact payload and headers down the active WebSocket to your localhost."
              },
              {
                q: "Where is user and workspace data stored?",
                a: "Workspaces, user accounts, and authentication tokens are persisted locally in SQLite via Prisma (apps/web/prisma/dev.db), ensuring full local privacy."
              }
            ].map((faq, idx) => (
              <div key={idx} className="neu-faq-card">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="neu-faq-btn"
                >
                  <span>{faq.q}</span>
                  <span style={{ color: 'var(--neu-accent)', fontSize: '1.25rem' }}>{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx && (
                  <div className="neu-faq-body">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Final Neumorphic CTA Frame */}
        <section className="neu-cta-frame">
          <h2 className="neu-cta-title">Inspect & debug webhooks with confidence.<br /><span className="neu-gradient-span">Start your local tunnel now.</span></h2>
          <p className="neu-cta-desc">
            Open the ZeroConfig dashboard to manage your workspaces, inspect live traffic, and test local integrations.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={() => handleProtectedNavigate('/dashboard')} 
              className="neu-btn-action neu-btn-primary-action"
              style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}
            >
              {session ? "Open Dashboard →" : "Get Started Free →"}
            </button>
          </div>
        </section>
      </main>

      {/* Neumorphic Footer */}
      <footer className="neu-footer">
        <div className="neu-container">
          <div className="neu-footer-grid">
            <div>
              <div className="neu-brand" style={{ marginBottom: '1rem' }}>
                <div className="neu-brand-icon">⚡</div>
                <span className="neu-brand-title">ZeroConfig</span>
              </div>
              <p style={{ lineHeight: 1.6, color: 'var(--neu-text-muted)', maxWidth: '320px' }}>
                Open-source local tunnel, WebSocket ingress engine, and real-time webhook inspector.
              </p>
            </div>

            <div className="neu-footer-col">
              <h4>Pages</h4>
              <ul className="neu-footer-links">
                <li><button onClick={() => handleProtectedNavigate('/dashboard')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Live Traffic Dashboard</button></li>
                <li><button onClick={() => handleProtectedNavigate('/workspaces')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Workspaces</button></li>
                <li><button onClick={() => handleProtectedNavigate('/dashboard/ai-gateway')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>AI Gateway</button></li>
                <li><button onClick={() => handleProtectedNavigate('/dashboard/policies')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Traffic Policies</button></li>
                <li><button onClick={() => handleProtectedNavigate('/setup')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Create Workspace</button></li>
              </ul>
            </div>

            <div className="neu-footer-col">
              <h4>Architecture</h4>
              <ul className="neu-footer-links">
                <li><a href="#architecture">Go Proxy (:8080)</a></li>
                <li><a href="#architecture">WebSocket Tunnel</a></li>
                <li><a href="#modules">Traffic Policies</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>

            <div className="neu-footer-col">
              <h4>Account</h4>
              <ul className="neu-footer-links">
                <li><Link href="/auth/signin">Sign In / Register</Link></li>
                <li><button onClick={() => handleProtectedNavigate('/workspaces')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>Your Tokens</button></li>
              </ul>
            </div>
          </div>

          <div className="neu-footer-bottom">
            <div>
              ZeroConfig Platform • Local Open Source Engine
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <button onClick={() => handleProtectedNavigate('/dashboard')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--neu-text-muted)', cursor: 'pointer' }}>Dashboard</button>
              <button onClick={() => handleProtectedNavigate('/workspaces')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--neu-text-muted)', cursor: 'pointer' }}>Workspaces</button>
              <button onClick={() => handleProtectedNavigate('/setup')} style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--neu-text-muted)', cursor: 'pointer' }}>Setup</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
