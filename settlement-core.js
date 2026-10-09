/* Motor comum aos dois modelos de acordo; valores arredondados em centavos. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CalculosEngCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const cents = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new RangeError('Os valores monetários devem ser finitos e não negativos.');
    }
    return Math.round(number * 100 + Number.EPSILON);
  };
  const reais = (value) => value / 100;
  const taxa = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0;
  };
  const parcela = (value, fraction) => Math.round(value * fraction);

  /**
   * tipo: "global" aplica deságio ao bruto inteiro; "juros" apenas aos juros.
   * Base contratual dos honorários: bruto do acordo, incluindo verbas e FGTS,
   * excluindo encargos patronais. Honorários inteiros são abatidos do crédito
   * bancário, pois o FGTS é lançado separadamente na conta vinculada.
   * O líquido do Blanco mantém seus descontos originais, proporcionalizados
   * no cenário global: NÃO substitui recálculo de IR/INSS na liquidação.
   */
  function simularAcordo(base, percentualDesagio, tipo = 'global') {
    if (tipo !== 'global' && tipo !== 'juros') {
      throw new RangeError('Tipo de deságio desconhecido.');
    }

    const rate = taxa(percentualDesagio);
    const advogadoPct = taxa(base.advogadoPct);
    const valorCorrigido = cents(base.valorCorrigido);
    const juros = cents(base.juros);
    const fgtsCorrigido = cents(base.fgtsCorrigido);
    const fgtsJuros = cents(base.fgtsJuros);
    const liquidoOriginal = cents(base.liquidoOriginal);
    const brutoOriginal = valorCorrigido + juros;
    const fgtsOriginal = fgtsCorrigido + fgtsJuros;

    if (fgtsCorrigido > valorCorrigido || fgtsJuros > juros ||
        fgtsOriginal > brutoOriginal || liquidoOriginal > brutoOriginal - fgtsOriginal) {
      throw new RangeError('As parcelas informadas não conciliam com o bruto original.');
    }

    let desagioDireto;
    let desagioFGTS;
    let liquidoAntesAdvogado;
    if (tipo === 'global') {
      const desagioTotal = parcela(brutoOriginal, rate);
      desagioFGTS = parcela(fgtsOriginal, rate);
      desagioDireto = desagioTotal - desagioFGTS;
      liquidoAntesAdvogado = liquidoOriginal - parcela(liquidoOriginal, rate);
    } else {
      desagioFGTS = parcela(fgtsJuros, rate);
      desagioDireto = parcela(juros - fgtsJuros, rate);
      liquidoAntesAdvogado = liquidoOriginal - desagioDireto;
    }

    const desagioTotal = desagioDireto + desagioFGTS;
    const brutoAcordo = brutoOriginal - desagioTotal;
    const fgtsFinal = fgtsOriginal - desagioFGTS;
    const baseHonorarios = brutoAcordo; // Verbas brutas + FGTS, após o deságio.
    const honorariosAdvogado = parcela(baseHonorarios, advogadoPct);
    const honorariosSobreFGTS = parcela(fgtsFinal, advogadoPct);
    const honorariosSobreVerbas = honorariosAdvogado - honorariosSobreFGTS;

    // A conta vinculada do FGTS recebe seu valor INTEGRAL após o deságio.
    // A parte dos honorários correspondente ao FGTS é paga pelo crédito direto.
    const honorariosPendentes = Math.max(0, honorariosAdvogado - liquidoAntesAdvogado);
    const liquidoFinal = Math.max(0, liquidoAntesAdvogado - honorariosAdvogado);
    const totalEconomico = liquidoFinal + fgtsFinal - honorariosPendentes;
    const descontosOriginais = brutoOriginal - fgtsOriginal - liquidoOriginal;
    const descontosEstimados = brutoAcordo - fgtsFinal - liquidoAntesAdvogado;

    const result = {
      tipo,
      rate,
      advogadoPct,
      fatorPagamento: 1 - rate,
      brutoOriginal: reais(brutoOriginal),
      fgtsOriginal: reais(fgtsOriginal),
      desagioDireto: reais(desagioDireto),
      desagioFGTS: reais(desagioFGTS),
      desagioTotal: reais(desagioTotal),
      desagioGlobal: reais(desagioTotal),
      brutoAcordo: reais(brutoAcordo),
      verbasBrutasAposDesagio: reais(brutoAcordo - fgtsFinal),
      liquidoAntesAdvogado: reais(liquidoAntesAdvogado),
      baseHonorarios: reais(baseHonorarios),
      honorariosAdvogado: reais(honorariosAdvogado),
      honorariosSobreFGTS: reais(honorariosSobreFGTS),
      honorariosSobreVerbas: reais(honorariosSobreVerbas),
      honorariosPendentes: reais(honorariosPendentes),
      liquidoFinal: reais(liquidoFinal),
      valorEmConta: reais(liquidoFinal),
      fgtsFinal: reais(fgtsFinal),
      totalEconomico: reais(totalEconomico),
      descontosOriginais: reais(descontosOriginais),
      descontosEstimados: reais(descontosEstimados),
      percentualBrutoAposHonorarios: brutoOriginal > 0 ? (brutoAcordo - honorariosAdvogado) / brutoOriginal : 0,
      percentualRecebido: brutoOriginal > 0 ? totalEconomico / brutoOriginal : 0,
      percentualEmConta: brutoOriginal > 0 ? liquidoFinal / brutoOriginal : 0,
      percentualFGTS: brutoOriginal > 0 ? fgtsFinal / brutoOriginal : 0
    };
    return result;
  }

  return { simularAcordo };
});
