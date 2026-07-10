package security

import (
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

type tentativaLogin struct {
	falhas    int
	bloqueado time.Time
}

var (
	loginMu    sync.Mutex
	loginPorIP = map[string]*tentativaLogin{}
)

const (
	loginMaxFalhas   = 8
	loginJanelaBloq  = 15 * time.Minute
	loginLimpezaIdle = 30 * time.Minute
)

// ipDoCliente usa o IP do socket (ou X-Real-IP do proxy de borda).
// Nunca confia no primeiro hop de X-Forwarded-For (spoofável pelo cliente).
// Com nginx `proxy_add_x_forwarded_for`, o último hop é o remote_addr visto pelo proxy.
func ipDoCliente(r *http.Request) string {
	if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
		if host := net.ParseIP(xri); host != nil {
			return xri
		}
	}

	if confiaNoProxy() {
		if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
			partes := strings.Split(xff, ",")
			for i := len(partes) - 1; i >= 0; i-- {
				candidato := strings.TrimSpace(partes[i])
				if net.ParseIP(candidato) != nil {
					return candidato
				}
			}
		}
	}

	host, _, erro := net.SplitHostPort(r.RemoteAddr)
	if erro != nil {
		return r.RemoteAddr
	}
	return host
}

func confiaNoProxy() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("TRUST_PROXY")))
	return v == "1" || v == "true" || v == "yes"
}

// LoginPermitido retorna false se o IP está temporariamente bloqueado por brute force.
func LoginPermitido(r *http.Request) bool {
	ip := ipDoCliente(r)
	agora := time.Now()

	loginMu.Lock()
	defer loginMu.Unlock()

	for k, v := range loginPorIP {
		if agora.Sub(v.bloqueado) > loginLimpezaIdle && v.falhas == 0 {
			delete(loginPorIP, k)
		}
	}

	t := loginPorIP[ip]
	if t == nil {
		return true
	}
	if !t.bloqueado.IsZero() && agora.Before(t.bloqueado) {
		return false
	}
	if !t.bloqueado.IsZero() && !agora.Before(t.bloqueado) {
		t.falhas = 0
		t.bloqueado = time.Time{}
	}
	return true
}

// RegistrarFalhaLogin incrementa contador e bloqueia após N falhas.
func RegistrarFalhaLogin(r *http.Request) {
	ip := ipDoCliente(r)
	agora := time.Now()

	loginMu.Lock()
	defer loginMu.Unlock()

	t := loginPorIP[ip]
	if t == nil {
		t = &tentativaLogin{}
		loginPorIP[ip] = t
	}
	t.falhas++
	if t.falhas >= loginMaxFalhas {
		t.bloqueado = agora.Add(loginJanelaBloq)
		t.falhas = 0
	}
}

// RegistrarSucessoLogin limpa o contador do IP.
func RegistrarSucessoLogin(r *http.Request) {
	ip := ipDoCliente(r)
	loginMu.Lock()
	delete(loginPorIP, ip)
	loginMu.Unlock()
}
