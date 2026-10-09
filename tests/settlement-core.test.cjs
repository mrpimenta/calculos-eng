const test = require('node:test');
const assert = require('node:assert/strict');
const { DESAGIO_GLOBAL, HONORARIOS, calcularAcordo } = require('../settlement-core.js');

// Valores inteiramente fictícios, sem dados individuais de empregados.
const exemplo = {
  valorCorrigido: 100000,
  juros: 20000,
  fgtsCorrigido: 8000,
  fgtsJuros: 2000,
  liquidoOriginal: 105000
};

test('O acordo não permite variar os percentuais nem a modalidade', () => {
  assert.equal(DESAGIO_GLOBAL, 0.20);
  assert.equal(HONORARIOS, 0.14);
  assert.equal(calcularAcordo.length, 1);
});

test('Acordo fechado 20% + 14% sobre verbas e FGTS, à vista', () => {
  const r = calcularAcordo(exemplo);
  assert.equal(r.brutoOriginal, 120000);
  assert.equal(r.fgtsOriginal, 10000);
  assert.equal(r.desagioGlobal, 24000);
  assert.equal(r.brutoAposDesagio, 96000);
  assert.equal(r.verbasBrutasAposDesagio, 88000);
  assert.equal(r.fgtsVinculado, 8000);
  assert.equal(r.liquidoAntesHonorarios, 84000);
  assert.equal(r.baseHonorarios, 96000);
  assert.equal(r.honorariosTotais, 13440);
  assert.equal(r.honorariosSobreVerbas, 12320);
  assert.equal(r.honorariosSobreFGTS, 1120);
  assert.equal(r.naConta, 70560);
  assert.equal(r.totalEconomico, 78560);
  assert.equal(r.descontosProporcionais, 4000);
  assert.equal(r.naConta + r.fgtsVinculado + r.honorariosTotais + r.descontosProporcionais, r.brutoAposDesagio);
  assert.equal(Math.round(r.percentualTeorico * 10000), 6880);
  assert.equal(Math.round(r.percentualTotal * 10000), 6547);
});

test('A parte dos honorários relativa ao FGTS sai do crédito direto', () => {
  const r = calcularAcordo({
    valorCorrigido: 100, juros: 0, fgtsCorrigido: 50,
    fgtsJuros: 0, liquidoOriginal: 50
  });
  assert.equal(r.baseHonorarios, 80);
  assert.equal(r.honorariosTotais, 11.20);
  assert.equal(r.honorariosSobreFGTS, 5.60);
  assert.equal(r.fgtsVinculado, 40);
  assert.equal(r.naConta, 28.80);
  assert.equal(r.totalEconomico, 68.80);
});

test('Saldo pendente de honorários não cria depósito bancário negativo', () => {
  const r = calcularAcordo({
    valorCorrigido: 1000, juros: 0, fgtsCorrigido: 990,
    fgtsJuros: 0, liquidoOriginal: 10
  });
  assert.equal(r.honorariosPendentes, 104);
  assert.equal(r.naConta, 0);
  assert.equal(r.fgtsVinculado, 792);
  assert.equal(r.totalEconomico, 688);
});

test('O motor recusa dados incompatíveis e não aceita valor bruto zerado', () => {
  assert.throws(() => calcularAcordo({
    valorCorrigido: 100, juros: 0, fgtsCorrigido: 90,
    fgtsJuros: 0, liquidoOriginal: 80
  }), RangeError);
  assert.throws(() => calcularAcordo({
    valorCorrigido: 0, juros: 0, fgtsCorrigido: 0,
    fgtsJuros: 0, liquidoOriginal: 0
  }), RangeError);
  assert.throws(() => calcularAcordo({
    ...exemplo, juros: -1
  }), RangeError);
});

test('Precisão em centavos em valores baixos', () => {
  const r = calcularAcordo({
    valorCorrigido: 1.01, juros: 0,
    fgtsCorrigido: 0, fgtsJuros: 0,
    liquidoOriginal: 1.01
  });
  assert.equal(r.desagioGlobal, 0.20);
  assert.equal(r.brutoAposDesagio, 0.81);
  assert.equal(r.honorariosTotais, 0.11);
  assert.equal(r.naConta, 0.70);
});
