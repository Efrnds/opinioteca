package repositorios

import (
	"fmt"
	"strings"
)

// placeholdersIN: in.
func placeholdersIN(inicio int, quantidade int) string {
	partes := make([]string, quantidade)
	for i := 0; i < quantidade; i++ {
		partes[i] = fmt.Sprintf("$%d", inicio+i)
	}
	return strings.Join(partes, ", ")
}

// idsParaArgs: para args.
func idsParaArgs(ids []uint64) []interface{} {
	args := make([]interface{}, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	return args
}
