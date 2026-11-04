import assert from "node:assert/strict";
import { test } from "node:test";
import { calcularProgressoLeitura, formatarPorcentagemLeitura } from "./progresso-leitura.ts";

test("porcentagem calcula apenas as páginas novas da sessão", () => {
    assert.deepEqual(calcularProgressoLeitura("porcentagem", 40, 25, 200), {
        paginasLidas: 30, paginaAtual: 80, porcentagem: 40,
    });
});

test("páginas lidas somam ao progresso anterior", () => {
    assert.deepEqual(calcularProgressoLeitura("paginas", 30, 25, 200), {
        paginasLidas: 30, paginaAtual: 80, porcentagem: 40,
    });
});

test("alternar a forma de informar preserva os dois valores", () => {
    const paginas = calcularProgressoLeitura("paginas", 1, 0, 300);
    assert.ok(paginas);
    assert.deepEqual(calcularProgressoLeitura("porcentagem", paginas.porcentagem, 0, 300), paginas);
});

test("arredondamento não acumula páginas extras entre registros", () => {
    let porcentagemAtual = 0;
    let totalLidas = 0;
    for (let i = 0; i < 300; i++) {
        const progresso = calcularProgressoLeitura("paginas", 1, porcentagemAtual, 300);
        assert.ok(progresso);
        totalLidas += progresso.paginasLidas;
        porcentagemAtual = progresso.porcentagem;
    }
    assert.equal(totalLidas, 300);
    assert.equal(porcentagemAtual, 100);
});

test("porcentagens consecutivas contam cada página uma vez", () => {
    let porcentagemAtual = 0;
    let totalLidas = 0;
    for (const valor of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
        const progresso = calcularProgressoLeitura("porcentagem", valor, porcentagemAtual, 13);
        assert.ok(progresso);
        totalLidas += progresso.paginasLidas;
        porcentagemAtual = progresso.porcentagem;
    }
    assert.equal(totalLidas, 13);
});

test("conclusão funciona nos dois modos", () => {
    for (const [tipo, valor] of [["paginas", 20], ["porcentagem", 100]]) {
        assert.deepEqual(calcularProgressoLeitura(tipo, valor, 90, 200), {
            paginasLidas: 20, paginaAtual: 200, porcentagem: 100,
        });
    }
});

test("não arredonda a última página para concluir antes de 100%", () => {
    assert.equal(calcularProgressoLeitura("porcentagem", 100, 99.9, 200)?.paginasLidas, 1);
});

test("bloqueia progresso inválido, excesso e livro sem total de páginas", () => {
    for (const [tipo, valor, atual, total] of [
        ["paginas", 0, 25, 200], ["paginas", -1, 25, 200],
        ["paginas", 1.5, 25, 200], ["paginas", 151, 25, 200],
        ["porcentagem", 25, 25, 200], ["porcentagem", 20, 25, 200],
        ["porcentagem", 101, 25, 200], ["porcentagem", NaN, 0, 200],
        ["paginas", 1, 0, 0], ["porcentagem", 10, 0, 0],
        ["paginas", 1, 100, 200], ["porcentagem", 0.01, 0, 200],
    ]) {
        assert.equal(calcularProgressoLeitura(tipo, valor, atual, total), null);
    }
});

test("porcentagem é exibida em pt-BR sem alterar o valor numérico", () => {
    assert.equal(formatarPorcentagemLeitura(100 / 3), "33,33");
});
