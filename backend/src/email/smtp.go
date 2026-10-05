package email

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
)

func configurado() bool {
	return strings.TrimSpace(os.Getenv("EMAIL_USER")) != "" &&
		strings.TrimSpace(os.Getenv("EMAIL_PASSWORD")) != ""
}

// EnviarOTPRecuperacaoSenha manda o código por Gmail SMTP.
// Sem EMAIL_* no .env, registra no log (dev) e não falha.
func EnviarOTPRecuperacaoSenha(destinatario, codigo string, validadeMinutos int) error {
	destinatario = strings.TrimSpace(destinatario)
	if destinatario == "" {
		return fmt.Errorf("destinatário vazio")
	}

	if !configurado() {
		log.Printf("[email] SMTP não configurado — OTP para %s: %s (válido %d min)", destinatario, codigo, validadeMinutos)
		return nil
	}

	from := strings.TrimSpace(os.Getenv("EMAIL_USER"))
	password := strings.TrimSpace(os.Getenv("EMAIL_PASSWORD"))
	fromName := strings.TrimSpace(os.Getenv("EMAIL_FROM_NAME"))
	if fromName == "" {
		fromName = "Opinioteca"
	}

	host := strings.TrimSpace(os.Getenv("EMAIL_SMTP_HOST"))
	if host == "" {
		host = "smtp.gmail.com"
	}
	port := strings.TrimSpace(os.Getenv("EMAIL_SMTP_PORT"))
	if port == "" {
		port = "587"
	}
	addr := host + ":" + port

	corpo := fmt.Sprintf(
		"Você pediu para redefinir a senha na Opinioteca.\r\n"+
			"\r\n"+
			"Código de verificação: %s\r\n"+
			"Este código vale por %d minutos.\r\n"+
			"\r\n"+
			"Se você não pediu isso, ignore este e-mail.\r\n",
		codigo,
		validadeMinutos,
	)

	mensagem := []byte(
		"From: " + fromName + " <" + from + ">\r\n" +
			"To: " + destinatario + "\r\n" +
			"Subject: Seu código para redefinir a senha\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/plain; charset=\"UTF-8\"\r\n" +
			"\r\n" +
			corpo,
	)

	auth := smtp.PlainAuth("", from, password, host)
	if erro := smtp.SendMail(addr, auth, from, []string{destinatario}, mensagem); erro != nil {
		return fmt.Errorf("falha ao enviar e-mail: %w", erro)
	}
	return nil
}
