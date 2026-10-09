const test = require('node:test');
const assert = require('node:assert/strict');
const { simularAcordo } = require('../settlement-core.js');

// Números fictícios: nenhum dado individual de reclamantes é armazenado aqui.
const exemplo = {
  valorCorrigido: 100000,
  juros: 20000,
  fgtsCorrigido: 8000,
  fgtsJuros: 2000,
  liquidoOriginal: 105000,
  advogadoPct: 0.14
};

test('Global 20%, honorários 14% sobre verbas + FGTS, pagamento à vista', () => {
  const r = simularAcordo(exemplo, 0.20, 'global');
  assert.equal(r.brutoOriginal, 120000);
  assert.equal(r.desagioGlobal, 24000);
  assert.equal(r.brutoAcordo, 96000);
  assert.equal(r.liquidoAntesAdvogado, 84000);
  assert.equal(r.fgtsFinal, 8000);
  assert.equal(r.baseHonorarios, 96000);
  assert.equal(r.honorariosAdvogado, 13440);
  assert.equal(r.honorariosSobreFGTS, 1120);
  assert.equal(r.honorariosSobreVerbas, 12320);
  assert.equal(r.valorEmConta, 70560);
  assert.equal(r.totalEconomico, 78560);
  assert.equal(r.descontosEstimados, 4000);
  assert.ok(Math.abs(r.percentualBrutoAposHonorarios - 0.688) < 1e-7);
  assert.equal(r.valorEmConta + r.fgtsFinal + r.honorariosAdvogado + r.descontosEstimados, r.brutoAcordo);
});

test('Honorários incluem FGTS, abatidos da conta e não do depósito FGTS', () => {
  const r = simularAcordo({
    valorCorrigido: 100, juros: 0, fgtsCorrigido: 50, fgtsJuros: 0,
    liquidoOriginal: 50, advogadoPct: 0.14
  }, 0.20, 'global');
  assert.equal(r.honorariosAdvogado, 11.20);
  assert.equal(r.honorariosSobreFGTS, 5.60);
  assert.equal(r.valorEmConta, 28.80);
  assert.equal(r.fgtsFinal, 40);
  assert.equal(r.totalEconomico, 68.80);
});

test('Modalidade sobre juros é independente do desconto global', () => {
  const r = simularAcordo(exemplo, 0.70, 'juros');
  assert.equal(r.desagioFGTS, 1400);
  assert.equal(r.desagioDireto, 12600);
  assert.equal(r.brutoAcordo, 106000);
  assert.equal(r.baseHonorarios, r.brutoAcordo);
  assert.equal(r.honorariosSobreFGTS + r.honorariosSobreVerbas, r.honorariosAdvogado);
});

test('Sem advogado, honorários zerados', () => {
  const r = simularAcordo({ ...exemplo, advogadoPct: 0 }, 0.2);
  assert.equal(r.honorariosAdvogado, 0);
  assert.equal(r.valorEmConta, r.liquidoAntesAdvogado);
});

test('Honorários superiores ao líquido direto: diferença pendente e depósito não negativo', () => {
  const r = simularAcordo({
    valorCorrigido: 1000, juros: 0, fgtsCorrigido: 990, fgtsJuros: 0,
    liquidoOriginal: 10, advogadoPct: 0.14
  }, 0.20, 'global');
  assert.equal(r.valorEmConta, 0);
  assert.equal(r.honorariosPendentes, 104);
  assert.equal(r.fgtsFinal, 792);
  assert.equal(r.totalEconomico, 688);
});

test('Rejeita FGTS e líquido que superam o crédito bruto', () => {
  assert.throws(() => simularAcordo({
    valorCorrigido: 100, juros: 0, fgtsCorrigido: 90, fgtsJuros: 0,
    liquidoOriginal: 80, advogadoPct: 0.14
  }, 0.20), RangeError);
});
