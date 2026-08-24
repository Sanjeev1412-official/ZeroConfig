# ZeroConfig: The Local Tunnel & Webhook Platform

## 📖 What is ZeroConfig?
Imagine you are building a new web application on your laptop. It runs on `http://localhost:3000`. You can see it, but nobody else on the internet can. If you want to show it to a client, or if you need to test a system like **Stripe** or **GitHub** sending data to your app (called a Webhook), those external systems cannot reach `localhost` because your laptop is hidden behind your home router.

**ZeroConfig** is a tool that solves this problem. It acts as a secure "tunnel" that punches a hole through your router, exposing your local, unfinished application to the public internet safely. It is an open-source alternative to popular tools like **Ngrok** or **Cloudflare Tunnels**.

---

## 🏗️ How Does it Work? (The Architecture)
ZeroConfig is made of three distinct pieces that work together in harmony:

### 1. The Go Proxy Server (`apps/proxy`)
Think of this as a public switchboard operator sitting on a server out on the real internet.
- **The Problem:** It needs to send internet traffic to your laptop, but it doesn't know where your laptop is.
- **The Solution:** The Proxy waits for your laptop to "call in" first using a persistent connection called a **WebSocket**. Once that connection is established, any time the Proxy receives a public HTTP request from the internet, it translates that request into a special message and shoves it down the WebSocket pipe directly to your laptop.

### 2. The Local CLI Agent (`packages/cli`)
Think of this as the messenger running on your laptop. 
- When you start it, it reaches out to the Go Proxy and says, *"Hey, I'm here! My ID is `test-client`."*
- It holds the WebSocket connection open.
- When the Proxy sends down a request (e.g., *"Someone wants to POST data to `/api/users`"*), the CLI Agent takes that data, walks over to your actual local development server (`http://localhost:3000`), and hands it over.
- When your local server responds, the CLI Agent captures the response, turns it into text, and fires it back up the WebSocket to the Proxy, which finally sends it back to the person on the internet.

### 3. The Next.js Dashboard (`apps/web`)
This is the beautiful, glassmorphic visual interface.
- As the Go Proxy handles thousands of requests passing through the tunnel, it broadcasts all that data live to this Next.js dashboard using **Server-Sent Events (SSE)**.
- The dashboard acts as a **Visual Webhook Inspector**. It allows you to watch traffic in real-time, click on requests, see exactly what data Stripe/GitHub sent to you, and see exactly how your local server responded—all without having to dig through messy terminal logs.

---

## 🛠️ What We Have Built So Far

### Phase 1: Core Tunneling
We laid the foundation of the tunnel loop.
- Built the **Go Proxy Server** to accept WebSockets and translate standard HTTP requests into JSON messages containing Base64 encoded bodies (so it can safely transport images, files, and text).
- Built the **Node.js Agent** to intercept those WebSocket messages, make raw HTTP calls to your `localhost` server, and ship the bytes back.
- **Result:** You can now successfully route traffic from `localhost:8080` (representing the public internet) down to a local server running on port `3000` via a WebSocket tunnel.

### Phase 2: Visual Webhook Inspector
We brought the data to life.
- Upgraded the Go Proxy to maintain an in-memory cache of the last 100 requests.
- Added an SSE (Server-Sent Events) live-stream to broadcast traffic to the browser.
- Completely rebuilt the Next.js frontend into a beautiful Split-Pane Dashboard that shows a live timeline of incoming requests and deeply inspects their Headers, JSON payloads, and Response times.

---

## 🚀 Why This Matters (The Value)
For beginners learning to code, testing Webhooks (like receiving a payment confirmation from Stripe) is notoriously difficult because Stripe cannot reach your `localhost`. 

With ZeroConfig, developers can safely test these integrations locally, visually inspect the exact data payloads that are being passed back and forth in real-time, and debug their code significantly faster.

---

## 🥊 ZeroConfig vs. Ngrok
It's true that Ngrok pioneered this space, but ZeroConfig is built to solve the limitations of proprietary SaaS tools:

1. **100% Free & Self-Hosted (No Paywalls):** Ngrok requires a paid monthly subscription if you want custom domains, unlimited tunnels, or multiple users. ZeroConfig is open-source. You can deploy the Go Proxy to a $5 cloud server (like DigitalOcean or AWS) and have unlimited, permanent tunnels with your own branded domains forever.
2. **Total Data Privacy:** When you use Ngrok, all of your sensitive webhooks (customer data, payment tokens, API keys) pass through Ngrok's corporate servers. With ZeroConfig, *you* own the proxy server, guaranteeing complete data privacy and sovereignty.
3. **Browser-First Architecture:** Because ZeroConfig communicates entirely over standard WebSockets, you aren't restricted to downloading a heavy binary. In the future, the agent can be run directly inside a browser tab or as a tiny `npm` package inside your app.
4. **Customizable Inspector UI:** Ngrok's web inspector is closed and rigid. ZeroConfig's Next.js dashboard is completely open; you can easily modify it to auto-format, highlight, or decode specific webhook payloads unique to your business.
