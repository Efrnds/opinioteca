package websockets

import (
	"backend/src/config"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

func origemPermitida(origin string) bool {
	if origin == "" {
		// Em produção, rejeita Origin vazio (clientes não-browser / CSRF fraco).
		env := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
		if env == "production" || env == "prod" {
			return false
		}
		// Dev: curl/wscat sem Origin.
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
		return origemPermitida(r.Header.Get("Origin"))
	},
}

type Hub struct {
	mu    sync.RWMutex
	conns map[uint64]*websocket.Conn
}

var hub = &Hub{conns: make(map[uint64]*websocket.Conn)}

func Upgrade(w http.ResponseWriter, r *http.Request, responseHeader http.Header) (*websocket.Conn, error) {
	return upgrader.Upgrade(w, r, responseHeader)
}

func Registrar(usuarioID uint64, conn *websocket.Conn) {
	hub.mu.Lock()
	if anterior, ok := hub.conns[usuarioID]; ok {
		anterior.Close()
	}
	hub.conns[usuarioID] = conn
	hub.mu.Unlock()
}

func Remover(usuarioID uint64) {
	hub.mu.Lock()
	delete(hub.conns, usuarioID)
	hub.mu.Unlock()
}

// IDsConectados retorna os usuários com WS ativo.
func IDsConectados() []uint64 {
	hub.mu.RLock()
	defer hub.mu.RUnlock()
	ids := make([]uint64, 0, len(hub.conns))
	for id := range hub.conns {
		ids = append(ids, id)
	}
	return ids
}

func enviar(conn *websocket.Conn, tipoEvento string, payload interface{}) {
	if conn == nil {
		return
	}
	dados, erro := json.Marshal(map[string]interface{}{
		"tipo":    tipoEvento,
		"payload": payload,
	})
	if erro != nil {
		return
	}
	conn.WriteMessage(websocket.TextMessage, dados)
}

func EnviarParaUsuario(usuarioID uint64, tipoEvento string, payload interface{}) {
	hub.mu.RLock()
	conn, ok := hub.conns[usuarioID]
	hub.mu.RUnlock()
	if !ok {
		return
	}
	enviar(conn, tipoEvento, payload)
}

func Broadcast(tipoEvento string, payload interface{}) {
	hub.mu.RLock()
	conns := make([]*websocket.Conn, 0, len(hub.conns))
	for _, conn := range hub.conns {
		if conn != nil {
			conns = append(conns, conn)
		}
	}
	hub.mu.RUnlock()

	for _, conn := range conns {
		enviar(conn, tipoEvento, payload)
	}
}

// BroadcastParaUsuarios envia só para a lista informada.
func BroadcastParaUsuarios(usuarioIDs []uint64, tipoEvento string, payload interface{}) {
	for _, id := range usuarioIDs {
		EnviarParaUsuario(id, tipoEvento, payload)
	}
}
