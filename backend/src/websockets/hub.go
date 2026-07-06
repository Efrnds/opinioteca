package websockets

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Hub struct {
	mu    sync.RWMutex
	conns map[uint64]*websocket.Conn
}

var hub = &Hub{conns: make(map[uint64]*websocket.Conn)}

func Upgrade(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	return upgrader.Upgrade(w, r, nil)
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
