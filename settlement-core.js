/* Acordo fechado: 20% de deságio global, 14% de honorários e pagamento à vista. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CalculosEngCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DESAGIO_GLOBAL = 0.20;
  const HONORARIOS = 0.14;
  const toCents = (value) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new RangeError('Todos os valores devem ser números não negativos.');
    }
    return Math.round(value * 100 + Number.EPSILON);
  };
  const toReais = (centavos) => centavos / 100;
  const roundPart = (centavos, rate) => Math.round(centavos * rate);

  function calcularAcordo(base) {
    if (!base || typeof base !== 'object') {
      throw new TypeError('Informe os cinco valores da planilha de cálculo.');
    }

    const corrigido = toCents(base.valorCorrigido);
    const juros = toCents(base.juros);
    const fgtsCorrigido = toCents(base.fgtsCorrigido);
    const fgtsJuros = toCents(base.fgtsJuros);
    const liquidoOriginal = toCents(base.liquidoOriginal);
    const brutoOriginal = corrigido + juros;
    const fgtsOriginal = fgtsCorrigido + fgtsJuros;

    if (brutoOriginal === 0) {
      throw new RangeError('O total original precisa ser maior que zero.');
    }
    if (fgtsCorrigido > corrigido || fgtsJuros > juros ||
        fgtsOriginal > brutoOriginal ||
        liquidoOriginal > brutoOriginal - fgtsOriginal) {
      throw new RangeError('Os valores não conciliam: confira total, FGTS e líquido do reclamante.');
    }

    // O deságio incide sobre o crédito bruto DO RECLAMANTE (inclusive FGTS),
    // e não sobre os encargos patronais ou honorários sucumbenciais da APS.
    const desagioGlobal = roundPart(brutoOriginal, DESAGIO_GLOBAL);
    const brutoAposDesagio = brutoOriginal - desagioGlobal;
    const desagioFGTS = roundPart(fgtsOriginal, DESAGIO_GLOBAL);
    const fgtsVinculado = fgtsOriginal - desagioFGTS;

    // Estimativa proporcional a partir do líquido já tributado na planilha Blanco.
    // Não equivale a novo cálculo de IRPF / INSS sobre um acordo homologado.
    const liquidoAntesHonorarios = liquidoOriginal -
      roundPart(liquidoOriginal, DESAGIO_GLOBAL);
    const descontosOriginais = brutoOriginal - fgtsOriginal - liquidoOriginal;
    const descontosProporcionais = brutoAposDesagio - fgtsVinculado - liquidoAntesHonorarios;

    // Honorários: 14% do crédito BRUTO após deságio, somando verbas + FGTS.
    // A parte dos honorários relativa ao FGTS sai das verbas bancárias, sem
    // subtrair os honorários uma segunda vez do depósito na conta vinculada.
    const baseHonorarios = brutoAposDesagio;
    const honorariosTotais = roundPart(baseHonorarios, HONORARIOS);
    const honorariosSobreFGTS = roundPart(fgtsVinculado, HONORARIOS);
    const honorariosSobreVerbas = honorariosTotais - honorariosSobreFGTS;

    const naConta = Math.max(0, liquidoAntesHonorarios - honorariosTotais);
    const honorariosPendentes = Math.max(0, honorariosTotais - liquidoAntesHonorarios);
    const totalEconomico = naConta + fgtsVinculado - honorariosPendentes;

    return {
      desagioPct: DESAGIO_GLOBAL,
      honorariosPct: HONORARIOS,
      brutoOriginal: toReais(brutoOriginal),
      fgtsOriginal: toReais(fgtsOriginal),
      liquidoOriginal: toReais(liquidoOriginal),
      descontosOriginais: toReais(descontosOriginais),
      desagioGlobal: toReais(desagioGlobal),
      brutoAposDesagio: toReais(brutoAposDesagio),
      verbasBrutasAposDesagio: toReais(brutoAposDesagio - fgtsVinculado),
      desagioFGTS: toReais(desagioFGTS),
      fgtsVinculado: toReais(fgtsVinculado),
      liquidoAntesHonorarios: toReais(liquidoAntesHonorarios),
      descontosProporcionais: toReais(descontosProporcionais),
      baseHonorarios: toReais(baseHonorarios),
      honorariosTotais: toReais(honorariosTotais),
      honorariosSobreVerbas: toReais(honorariosSobreVerbas),
      honorariosSobreFGTS: toReais(honorariosSobreFGTS),
      naConta: toReais(naConta),
      honorariosPendentes: toReais(honorariosPendentes),
      totalEconomico: toReais(totalEconomico),
      percentualNaConta: naConta / brutoOriginal,
      percentualFGTS: fgtsVinculado / brutoOriginal,
      percentualTotal: totalEconomico / brutoOriginal,
      percentualTeorico: (brutoAposDesagio - honorariosTotais) / brutoOriginal
    };
  }

  return Object.freeze({ DESAGIO_GLOBAL, HONORARIOS, calcularAcordo });
});
