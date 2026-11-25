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

	googleMaxFalhas = 40
)

func ehLoopback(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return ip == "localhost" || strings.HasPrefix(ip, "127.") || ip == "::1"
	}
	return parsed.IsLoopback()
}

func ipDoCliente(r *http.Request) string {
	remoteHost, _, _ := net.SplitHostPort(r.RemoteAddr)
	if remoteHost == "" {
		remoteHost = r.RemoteAddr
	}

	if ehLoopback(remoteHost) {
		if cip := strings.TrimSpace(r.Header.Get("X-Opinioteca-Client-IP")); cip != "" {
			if host := net.ParseIP(cip); host != nil {
				return cip
			}
		}
		if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
			parte := strings.TrimSpace(strings.Split(xff, ",")[0])
			if net.ParseIP(parte) != nil {
				return parte
			}
		}
	}

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

	if remoteHost != "" {
		return remoteHost
	}
	return r.RemoteAddr
}

func confiaNoProxy() bool {
	v := strings.ToLower(strings.TrimSpace(os.Getenv("TRUST_PROXY")))
	return v == "1" || v == "true" || v == "yes"
}

func chaveRateLimit(r *http.Request, escopo string) string {
	escopo = strings.ToLower(strings.TrimSpace(escopo))
	ip := ipDoCliente(r)

	if escopo != "" {

		if !strings.HasPrefix(escopo, "google:") {
			return "nick:" + escopo
		}

		if !ehLoopback(ip) {
			return "google:" + ip
		}
		return "google:bff"
	}

	if ehLoopback(ip) {

		return "loopback:ignore"
	}
	return "ip:" + ip
}

func maxFalhasPara(chave string) int {
	if strings.HasPrefix(chave, "google:") {
		return googleMaxFalhas
	}
	return loginMaxFalhas
}

func LoginPermitido(r *http.Request, escopo ...string) bool {
	esc := ""
	if len(escopo) > 0 {
		esc = escopo[0]
	}
	chave := chaveRateLimit(r, esc)
	if chave == "loopback:ignore" {
		return true
	}

	agora := time.Now()

	loginMu.Lock()
	defer loginMu.Unlock()

	for k, v := range loginPorIP {
		if agora.Sub(v.bloqueado) > loginLimpezaIdle && v.falhas == 0 {
			delete(loginPorIP, k)
		}
	}

	t := loginPorIP[chave]
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

func RegistrarFalhaLogin(r *http.Request, escopo ...string) {
	esc := ""
	if len(escopo) > 0 {
		esc = escopo[0]
	}
	chave := chaveRateLimit(r, esc)
	if chave == "loopback:ignore" {
		return
	}

	agora := time.Now()
	limite := maxFalhasPara(chave)

	loginMu.Lock()
	defer loginMu.Unlock()

	t := loginPorIP[chave]
	if t == nil {
		t = &tentativaLogin{}
		loginPorIP[chave] = t
	}
	t.falhas++
	if t.falhas >= limite {
		t.bloqueado = agora.Add(loginJanelaBloq)
		t.falhas = 0
	}
}

func RegistrarSucessoLogin(r *http.Request, escopo ...string) {
	esc := ""
	if len(escopo) > 0 {
		esc = escopo[0]
	}
	chave := chaveRateLimit(r, esc)

	loginMu.Lock()
	delete(loginPorIP, chave)

	ip := ipDoCliente(r)
	delete(loginPorIP, ip)
	delete(loginPorIP, "ip:"+ip)
	delete(loginPorIP, "google:"+ip)
	delete(loginPorIP, "google:bff")
	loginMu.Unlock()
}

func LimparTodosBloqueiosLogin() {
	loginMu.Lock()
	loginPorIP = map[string]*tentativaLogin{}
	loginMu.Unlock()
}
