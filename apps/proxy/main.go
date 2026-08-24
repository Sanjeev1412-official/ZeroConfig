package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"golang.org/x/time/rate"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSMessage struct {
	Type      string              `json:"type"`
	RequestID string              `json:"requestId"`
	Method    string              `json:"method,omitempty"`
	Path      string              `json:"path,omitempty"`
	Headers   map[string][]string `json:"headers,omitempty"`
	Body      string              `json:"body,omitempty"`
	Status    int                 `json:"status,omitempty"`
}

type TrafficLog struct {
	ID             string              `json:"id"`
	Timestamp      int64               `json:"timestamp"`
	Method         string              `json:"method"`
	Path           string              `json:"path"`
	ReqHeaders     map[string][]string `json:"reqHeaders"`
	ReqBodyBase64  string              `json:"reqBodyBase64"`
	Status         int                 `json:"status"`
	RespHeaders    map[string][]string `json:"respHeaders"`
	RespBodyBase64 string              `json:"respBodyBase64"`
	DurationMs     int64               `json:"durationMs"`
}

type Client struct {
	ID   string
	Conn *websocket.Conn
	mu   sync.Mutex
}

type Broker struct {
	mu          sync.Mutex
	subscribers map[string]map[chan TrafficLog]bool
}

var (
	clients          sync.Map // map[string]*sync.Map (map[*Client]bool)
	pendingRequests  sync.Map // map[string]chan WSMessage
	history          sync.Map // map[string][]TrafficLog
	authTokens       sync.Map // map[string]string (Token -> ClientID)
	clientRoundRobin sync.Map // map[string]*uint64
	clientLimiters   sync.Map // map[string]*rate.Limiter
	broker           = &Broker{
		subscribers: make(map[string]map[chan TrafficLog]bool),
	}
)

const maxHistory = 100

func addLogToHistory(clientID string, entry TrafficLog) {
	var logs []TrafficLog
	if existing, ok := history.Load(clientID); ok {
		logs = existing.([]TrafficLog)
	}
	logs = append([]TrafficLog{entry}, logs...)
	if len(logs) > maxHistory {
		logs = logs[:maxHistory]
	}
	history.Store(clientID, logs)
}

func broadcastLog(clientID string, entry TrafficLog) {
	broker.mu.Lock()
	defer broker.mu.Unlock()
	if subs, ok := broker.subscribers[clientID]; ok {
		for ch := range subs {
			select {
			case ch <- entry:
			default:
			}
		}
	}
}

func validateToken(r *http.Request) (string, bool) {
	token := r.URL.Query().Get("token")
	if token == "" {
		token = r.Header.Get("x-client-id")
	}
	if token == "" {
		return "", false
	}
	if clientIDAny, ok := authTokens.Load(token); ok {
		return clientIDAny.(string), true
	}
	return token, true
}

func tokenHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.WriteHeader(http.StatusOK)
		return
	}

	clientID := r.URL.Query().Get("clientId")
	if clientID == "" {
		http.Error(w, "missing clientId", http.StatusBadRequest)
		return
	}

	token := "sk_zc_" + strings.ReplaceAll(uuid.New().String(), "-", "")
	authTokens.Store(token, clientID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	clientID, valid := validateToken(r)
	if !valid {
		http.Error(w, "Unauthorized - Invalid Token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket Upgrade error:", err)
		return
	}

	client := &Client{ID: clientID, Conn: conn}
	groupAny, _ := clients.LoadOrStore(clientID, &sync.Map{})
	group := groupAny.(*sync.Map)
	group.Store(client, true)

	log.Printf("Client connected to swarm: %s (Auth successful)\n", clientID)

	defer func() {
		group.Delete(client)
		conn.Close()
		log.Printf("Client disconnected from swarm: %s\n", clientID)
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		var msg WSMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}
		if msg.Type == "response" {
			if chAny, ok := pendingRequests.Load(msg.RequestID); ok {
				ch := chAny.(chan WSMessage)
				select {
				case ch <- msg:
				default:
				}
			}
		}
	}
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	clientID, valid := validateToken(r)
	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	online := false
	if groupAny, ok := clients.Load(clientID); ok {
		group := groupAny.(*sync.Map)
		count := 0
		group.Range(func(key, value interface{}) bool { count++; return true })
		online = count > 0
	}

	json.NewEncoder(w).Encode(map[string]bool{"online": online})
}

func logsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	clientID, valid := validateToken(r)
	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var logs []TrafficLog
	if existing, ok := history.Load(clientID); ok {
		logs = existing.([]TrafficLog)
	} else {
		logs = []TrafficLog{}
	}
	json.NewEncoder(w).Encode(logs)
}

func streamHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	clientID, valid := validateToken(r)
	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	msgChan := make(chan TrafficLog, 10)
	broker.mu.Lock()
	if broker.subscribers[clientID] == nil {
		broker.subscribers[clientID] = make(map[chan TrafficLog]bool)
	}
	broker.subscribers[clientID][msgChan] = true
	broker.mu.Unlock()

	defer func() {
		broker.mu.Lock()
		delete(broker.subscribers[clientID], msgChan)
		broker.mu.Unlock()
		close(msgChan)
	}()

	notify := r.Context().Done()
	for {
		select {
		case <-notify:
			return
		case logEntry := <-msgChan:
			data, _ := json.Marshal(logEntry)
			fmt.Fprintf(w, "data: %s\n\n", string(data))
			flusher.Flush()
		}
	}
}

func dispatchToSwarm(clientID, reqID, method, path string, headers map[string][]string, base64Body string) (WSMessage, int64, error) {
	groupAny, ok := clients.Load(clientID)
	if !ok {
		if mappedID, found := authTokens.Load(clientID); found {
			groupAny, ok = clients.Load(mappedID.(string))
		}
	}
	if !ok {
		return WSMessage{}, 0, fmt.Errorf("Tunnel offline")
	}
	group := groupAny.(*sync.Map)
	
	var activeClients []*Client
	group.Range(func(key, value interface{}) bool { 
		activeClients = append(activeClients, key.(*Client))
		return true 
	})
	count := len(activeClients)
	if count == 0 {
		return WSMessage{}, 0, fmt.Errorf("Tunnel offline")
	}

	// --- Load Balancing: Round Robin ---
	rrAny, _ := clientRoundRobin.LoadOrStore(clientID, new(uint64))
	rrCounter := rrAny.(*uint64)
	idx := atomic.AddUint64(rrCounter, 1) % uint64(count)
	selectedClient := activeClients[idx]

	start := time.Now()
	msg := WSMessage{
		Type:      "request",
		RequestID: reqID,
		Method:    method,
		Path:      path,
		Headers:   headers,
		Body:      base64Body,
	}

	respCh := make(chan WSMessage, 1)
	pendingRequests.Store(reqID, respCh)
	defer pendingRequests.Delete(reqID)

	selectedClient.mu.Lock()
	selectedClient.Conn.WriteJSON(msg)
	selectedClient.mu.Unlock()

	select {
	case respMsg := <-respCh:
		duration := time.Since(start).Milliseconds()
		return respMsg, duration, nil
	case <-time.After(30 * time.Second):
		return WSMessage{}, 0, fmt.Errorf("Gateway Timeout")
	}
}

func replayHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST")
		w.WriteHeader(http.StatusOK)
		return
	}

	clientID, valid := validateToken(r)
	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	logID := r.URL.Query().Get("logId")
	if logID == "" {
		http.Error(w, "missing logId", http.StatusBadRequest)
		return
	}

	var targetLog *TrafficLog
	if existing, ok := history.Load(clientID); ok {
		logs := existing.([]TrafficLog)
		for _, l := range logs {
			if l.ID == logID {
				targetLog = &l
				break
			}
		}
	}

	if targetLog == nil {
		http.Error(w, "Log not found", http.StatusNotFound)
		return
	}

	newReqID := uuid.New().String()
	
	// Perform dispatch async to not block this HTTP response
	go func() {
		respMsg, duration, err := dispatchToSwarm(clientID, newReqID, targetLog.Method, targetLog.Path, targetLog.ReqHeaders, targetLog.ReqBodyBase64)
		if err == nil {
			logEntry := TrafficLog{
				ID:             newReqID,
				Timestamp:      time.Now().UnixMilli(),
				Method:         targetLog.Method,
				Path:           targetLog.Path,
				ReqHeaders:     targetLog.ReqHeaders,
				ReqBodyBase64:  targetLog.ReqBodyBase64,
				Status:         respMsg.Status,
				RespHeaders:    respMsg.Headers,
				RespBodyBase64: respMsg.Body,
				DurationMs:     duration,
			}
			addLogToHistory(clientID, logEntry)
			broadcastLog(clientID, logEntry)
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"newReqId": newReqID})
}

func proxyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
		w.Header().Set("Access-Control-Allow-Headers", "*")
		w.Header().Set("Access-Control-Allow-Methods", "*")
		w.WriteHeader(http.StatusOK)
		return
	}

	// Dynamic Routing Resolution
	// 1. Check Subdomain (e.g. my-workspaceeee.localhost:8080 or test-client.localhost:8080)
	clientID := ""
	host := strings.Split(r.Host, ":")[0]
	if strings.Count(host, ".") > 0 {
		parts := strings.Split(host, ".")
		if parts[0] != "localhost" && parts[0] != "127" {
			clientID = parts[0] // e.g. "my-workspaceeee" from "my-workspaceeee.localhost"
		}
	}
	
	// 2. Query param or Header fallback
	if clientID == "" {
		clientID = r.URL.Query().Get("clientId")
	}
	if clientID == "" {
		clientID = r.URL.Query().Get("token")
	}
	if clientID == "" {
		clientID = r.Header.Get("x-client-id")
	}

	if clientID == "" {
		http.Error(w, "Missing valid subdomain or x-client-id header", http.StatusBadRequest)
		return
	}

	// --- Reject WebSocket Upgrade requests (can't tunnel WS through HTTP proxy) ---
	if strings.EqualFold(r.Header.Get("Upgrade"), "websocket") {
		http.Error(w, "WebSocket tunneling is not supported via Browser Agent proxy", http.StatusNotImplemented)
		return
	}

	// --- Skip dev-only internal Next.js paths from being logged as traffic ---
	isDevNoise := strings.HasPrefix(r.URL.Path, "/_next/hmr") ||
		strings.HasPrefix(r.URL.Path, "/_next/webpack-hmr") ||
		strings.HasPrefix(r.URL.Path, "/__nextjs") ||
		strings.HasPrefix(r.URL.Path, "/_next/static/development")
	if isDevNoise {
		http.Error(w, "Not Found", http.StatusNotFound)
		return
	}

	// --- Traffic Policy: Rate Limiting ---
	limiterAny, _ := clientLimiters.LoadOrStore(clientID, rate.NewLimiter(rate.Limit(10), 20)) // 10 req/s, burst 20
	limiter := limiterAny.(*rate.Limiter)
	if !limiter.Allow() {
		http.Error(w, "429 Too Many Requests - Traffic Policy Enforced", http.StatusTooManyRequests)
		return
	}

	// --- Traffic Policy: Header Injection ---
	r.Header.Set("X-ZeroConfig-Forwarded", "true")

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusInternalServerError)
		return
	}
	base64Body := base64.StdEncoding.EncodeToString(bodyBytes)

	// Clean query params so internal routing params aren't forwarded to local target
	q := r.URL.Query()
	q.Del("clientId")
	q.Del("token")
	cleanQuery := q.Encode()

	path := r.URL.Path
	if cleanQuery != "" {
		path += "?" + cleanQuery
	}

	reqID := uuid.New().String()
	respMsg, duration, err := dispatchToSwarm(clientID, reqID, r.Method, path, r.Header, base64Body)
	
	if err != nil {
		if err.Error() == "Gateway Timeout" {
			http.Error(w, "Gateway Timeout", http.StatusGatewayTimeout)
		} else {
			http.Error(w, "Tunnel offline", http.StatusBadGateway)
		}
		return
	}

	// Write Response Headers (excluding hop-by-hop and encoding headers)
	for k, v := range respMsg.Headers {
		lk := strings.ToLower(k)
		if lk == "content-encoding" || lk == "content-length" || lk == "transfer-encoding" || lk == "connection" {
			continue
		}
		for _, val := range v {
			w.Header().Add(k, val)
		}
	}
	w.WriteHeader(respMsg.Status)

	if respMsg.Body != "" {
		decodedBody, err := base64.StdEncoding.DecodeString(respMsg.Body)
		if err == nil {
			w.Write(decodedBody)
		}
	}

	logEntry := TrafficLog{
		ID:             reqID,
		Timestamp:      time.Now().UnixMilli(),
		Method:         r.Method,
		Path:           path,
		ReqHeaders:     r.Header,
		ReqBodyBase64:  base64Body,
		Status:         respMsg.Status,
		RespHeaders:    respMsg.Headers,
		RespBodyBase64: respMsg.Body,
		DurationMs:     duration,
	}

	// --- AI Gateway Observability ---
	if strings.Contains(path, "/v1/chat/completions") || strings.Contains(path, "/api/generate") {
		estimatedPromptTokens := len(base64Body) / 4
		estimatedCompletionTokens := len(respMsg.Body) / 4
		log.Printf("[AI Gateway] Client %s used ~%d prompt tokens, ~%d completion tokens\n", clientID, estimatedPromptTokens, estimatedCompletionTokens)
	}

	// --- Only log meaningful traffic (skip static assets, cache hits, dev noise) ---
	isStaticAsset := strings.HasPrefix(r.URL.Path, "/_next/static/") ||
		strings.HasPrefix(r.URL.Path, "/_next/image") ||
		strings.HasPrefix(r.URL.Path, "/favicon") ||
		strings.HasSuffix(r.URL.Path, ".css") ||
		strings.HasSuffix(r.URL.Path, ".js") ||
		strings.HasSuffix(r.URL.Path, ".ico") ||
		strings.HasSuffix(r.URL.Path, ".png") ||
		strings.HasSuffix(r.URL.Path, ".jpg") ||
		strings.HasSuffix(r.URL.Path, ".svg") ||
		strings.HasSuffix(r.URL.Path, ".woff") ||
		strings.HasSuffix(r.URL.Path, ".woff2") ||
		strings.HasSuffix(r.URL.Path, ".ttf") ||
		strings.HasSuffix(r.URL.Path, ".map")
	
	isCacheHit := respMsg.Status == 304
	
	if !isStaticAsset && !isCacheHit {
		addLogToHistory(clientID, logEntry)
		broadcastLog(clientID, logEntry)
	}
}

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("/_api/token", tokenHandler)
	mux.HandleFunc("/_api/replay", replayHandler)
	mux.HandleFunc("/_ws", wsHandler)
	mux.HandleFunc("/_api/status", statusHandler)
	mux.HandleFunc("/_api/logs", logsHandler)
	mux.HandleFunc("/_api/logs/stream", streamHandler)
	mux.HandleFunc("/", proxyHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	addr := ":" + port
	fmt.Printf("ZeroConfig Proxy running on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(addr, mux))
}
