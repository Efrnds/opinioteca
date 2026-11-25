package websockets

import (
	"backend/src/utils/config"
	"encoding/json"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

func hostnameSemPorta(hostport string) string {
	hostport = strings.TrimSpace(strings.ToLower(hostport))
	if hostport == "" {
		return ""
	}
	if h, _, erro := net.SplitHostPort(hostport); erro == nil {
		return h
	}
	return hostport
}

func origemPermitida(origin, requestHost string) bool {
	if origin == "" {

		env := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
		if env == "production" || env == "prod" {
			return false
		}

		return true
	}
	parsed, erro := url.Parse(origin)
	if erro != nil {
		return false
	}
	host := strings.ToLower(parsed.Hostname())
	if host == "localhost" || host == "127.0.0.1" {
		return true
	}

	if reqHost := hostnameSemPorta(requestHost); reqHost != "" && strings.EqualFold(reqHost, host) {
		return true
	}

	candidatos := []string{config.APIPublicURL, os.Getenv("FRONTEND_URL"), os.Getenv("AUTH_URL")}
	for _, raw := range candidatos {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		base, erroBase := url.Parse(raw)
		if erroBase != nil {
			continue
		}
		if strings.EqualFold(base.Hostname(), host) {
			return true
		}
	}
	return false
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return origemPermitida(r.Header.Get("Origin"), r.Host)
	},
}

type cliente struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

type Hub struct {
	mu    sync.RWMutex
	conns map[uint64]*cliente
}

var hub = &Hub{conns: make(map[uint64]*cliente)}

func Upgrade(w http.ResponseWriter, r *http.Request, responseHeader http.Header) (*websocket.Conn, error) {
	return upgrader.Upgrade(w, r, responseHeader)
}

func Registrar(usuarioID uint64, conn *websocket.Conn) {
	hub.mu.Lock()
	if anterior, ok := hub.conns[usuarioID]; ok {
		anterior.conn.Close()
	}
	hub.conns[usuarioID] = &cliente{conn: conn}
	hub.mu.Unlock()
}

func Remover(usuarioID uint64) {
	hub.mu.Lock()
	delete(hub.conns, usuarioID)
	hub.mu.Unlock()
}

func RemoverConn(usuarioID uint64, conn *websocket.Conn) {
	hub.mu.Lock()
	if atual, ok := hub.conns[usuarioID]; ok && atual.conn == conn {
		delete(hub.conns, usuarioID)
	}
	hub.mu.Unlock()
}

func IDsConectados() []uint64 {
	hub.mu.RLock()
	defer hub.mu.RUnlock()
	ids := make([]uint64, 0, len(hub.conns))
	for id := range hub.conns {
		ids = append(ids, id)
	}
	return ids
}

func (c *cliente) escrever(tipoEvento string, payload interface{}) error {
	dados, erro := json.Marshal(map[string]interface{}{
		"tipo":    tipoEvento,
		"payload": payload,
	})
	if erro != nil {
		return erro
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.WriteMessage(websocket.TextMessage, dados)
}

func EnviarParaUsuario(usuarioID uint64, tipoEvento string, payload interface{}) {
	hub.mu.RLock()
	c, ok := hub.conns[usuarioID]
	hub.mu.RUnlock()
	if !ok || c == nil {
		return
	}
	if erro := c.escrever(tipoEvento, payload); erro != nil {
		RemoverConn(usuarioID, c.conn)
		_ = c.conn.Close()
	}
}

func Broadcast(tipoEvento string, payload interface{}) {
	hub.mu.RLock()
	snapshot := make(map[uint64]*cliente, len(hub.conns))
	for id, c := range hub.conns {
		if c != nil {
			snapshot[id] = c
		}
	}
	hub.mu.RUnlock()

	for id, c := range snapshot {
		if erro := c.escrever(tipoEvento, payload); erro != nil {
			RemoverConn(id, c.conn)
			_ = c.conn.Close()
		}
	}
}

func BroadcastParaUsuarios(usuarioIDs []uint64, tipoEvento string, payload interface{}) {
	for _, id := range usuarioIDs {
		EnviarParaUsuario(id, tipoEvento, payload)
	}
}
