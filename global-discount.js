(() => {
  'use strict';
  const REQUIRED_IDS = ['valorCorrigido', 'juros', 'fgtsCorrigido', 'fgtsJuros', 'liquidoOriginal'];
  const WATCH_IDS = [...REQUIRED_IDS, 'advogadoPct', 'globalBaseDiscountRate'];
  const OUTPUT_IDS = [
    'wholeGlobalRate', 'wholeGlobalDiscountAmount', 'wholeGlobalGrossAfter',
    'wholeGlobalGrossVerbas', 'wholeGlobalPreLawyer', 'wholeGlobalLawyerBase',
    'wholeGlobalLawyer', 'wholeGlobalLawyerFgts', 'wholeGlobalLawyerVerbas',
    'wholeGlobalNet', 'wholeGlobalFgts', 'wholeGlobalEconomic',
    'wholeGlobalPct', 'wholeGlobalTheoreticalPct', 'wholeGlobalTaxEstimate',
    'settlementBank', 'settlementFgts', 'settlementTotal', 'settlementPct',
    'settlementFee', 'settlementGlobalDiscount', 'settlementTheoreticalPct'
  ];
  const el = (id) => document.getElementById(id);

  function parseBR(value) {
    if (typeof value !== 'string') return Number(value) || 0;
    const s = value.trim().replace(/\s/g, '').replace(/R\$/gi, '');
    if (!s) return 0;
    const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  const money = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(value || 0);
  const percent = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'percent', maximumFractionDigits: 2
  }).format(value || 0);

  function complete() {
    return REQUIRED_IDS.every((id) => el(id).value.trim() !== '');
  }

  function readBase() {
    return {
      valorCorrigido: parseBR(el('valorCorrigido').value),
      juros: parseBR(el('juros').value),
      fgtsCorrigido: parseBR(el('fgtsCorrigido').value),
      fgtsJuros: parseBR(el('fgtsJuros').value),
      liquidoOriginal: parseBR(el('liquidoOriginal').value),
      advogadoPct: Math.min(1, Math.max(0, parseBR(el('advogadoPct').value) / 100))
    };
  }

  function selectedRate() {
    return Math.min(100, Math.max(0, parseBR(el('globalBaseDiscountRate').value))) / 100;
  }

  function simulateGlobal(base, rate) {
    return window.CalculosEngCalc.simularAcordo(base, rate, 'global');
  }

  function clear() {
    OUTPUT_IDS.forEach((id) => { if (el(id)) el(id).textContent = '—'; });
    el('mainSettlementBadge').textContent = 'À vista · deságio global de 20% · advogado 14%';
    el('wholeGlobalCompareBody').innerHTML =
      '<tr><td colspan="8" class="empty-row">Preencha os cinco valores do Blanco para comparar os descontos globais.</td></tr>';
    el('wholeGlobalMemory').innerHTML = '';
    el('wholeGlobalWarning').textContent = '';
  }

  function renderQuickButtons(rate) {
    document.querySelectorAll('#globalDiscountQuick [data-global-rate]').forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        Math.abs(Number(button.dataset.globalRate) / 100 - rate) < 0.000001 ? 'true' : 'false'
      );
    });
  }

  function renderMemory(result) {
    const rows = [
      ['Crédito bruto original (verbas + FGTS)', result.brutoOriginal],
      ['Deságio global da APS', result.desagioTotal],
      ['Crédito bruto após o deságio', result.brutoAcordo],
      ['Verbas brutas após o deságio', result.verbasBrutasAposDesagio],
      ['FGTS após o deságio', result.fgtsFinal],
      ['Líquido direto estimado antes do advogado (descontos originais proporcionalizados)', result.liquidoAntesAdvogado],
      ['Base dos honorários: verbas brutas + FGTS após deságio', result.baseHonorarios],
      ['Honorários sobre verbas', result.honorariosSobreVerbas],
      ['Honorários sobre FGTS (cobrados do crédito direto)', result.honorariosSobreFGTS],
      ['Total dos honorários contratuais', result.honorariosAdvogado],
      ['Crédito bancário à vista após honorários', result.valorEmConta],
      ['Depósito na conta vinculada FGTS', result.fgtsFinal],
      ['Valor econômico líquido (banco + FGTS − honorários eventualmente pendentes)', result.totalEconomico],
      ['Descontos tributários/previdenciários estimados já considerados no líquido', result.descontosEstimados]
    ];
    el('wholeGlobalMemory').innerHTML = rows.map(([label, value]) =>
      '<div class="memory-item"><span>' + label + '</span><strong>' + money(value) + '</strong></div>'
    ).join('');
  }

  function render() {
    const rate = selectedRate();
    const fee = Math.min(1, Math.max(0, parseBR(el('advogadoPct').value) / 100));
    renderQuickButtons(rate);
    if (!complete()) {
      clear();
      el('mainSettlementBadge').textContent = 'À vista · deságio global de ' + percent(rate) + ' · advogado ' + percent(fee);
      return;
    }

    let result;
    let base;
    try {
      base = readBase();
      result = simulateGlobal(base, rate);
    } catch (err) {
      clear();
      el('wholeGlobalWarning').textContent = 'Confira os valores: ' + err.message;
      return;
    }

    const values = {
      wholeGlobalRate: percent(result.rate),
      wholeGlobalDiscountAmount: money(result.desagioTotal),
      wholeGlobalGrossAfter: money(result.brutoAcordo),
      wholeGlobalGrossVerbas: money(result.verbasBrutasAposDesagio),
      wholeGlobalPreLawyer: money(result.liquidoAntesAdvogado),
      wholeGlobalLawyerBase: money(result.baseHonorarios),
      wholeGlobalLawyer: money(result.honorariosAdvogado),
      wholeGlobalLawyerFgts: money(result.honorariosSobreFGTS),
      wholeGlobalLawyerVerbas: money(result.honorariosSobreVerbas),
      wholeGlobalNet: money(result.valorEmConta),
      wholeGlobalFgts: money(result.fgtsFinal),
      wholeGlobalEconomic: money(result.totalEconomico),
      wholeGlobalPct: percent(result.percentualRecebido),
      wholeGlobalTheoreticalPct: percent(result.percentualBrutoAposHonorarios),
      wholeGlobalTaxEstimate: money(result.descontosEstimados),
      settlementBank: money(result.valorEmConta),
      settlementFgts: money(result.fgtsFinal),
      settlementTotal: money(result.totalEconomico),
      settlementPct: percent(result.percentualRecebido),
      settlementFee: money(result.honorariosAdvogado),
      settlementGlobalDiscount: money(result.desagioTotal),
      settlementTheoreticalPct: percent(result.percentualBrutoAposHonorarios)
    };
    Object.entries(values).forEach(([id, value]) => { el(id).textContent = value; });
    el('mainSettlementBadge').textContent =
      'À vista · deságio global de ' + percent(rate) + ' · advogado ' + percent(fee) + ' (verbas + FGTS)';

    el('wholeGlobalWarning').textContent = result.honorariosPendentes > 0
      ? 'Atenção: o crédito direto não cobre todos os honorários. Saldo a quitar: ' +
        money(result.honorariosPendentes) + '. O percentual total já considera essa obrigação.'
      : '';

    const rates = [...new Set([0.15, 0.20, 0.30, 0.50, Number(rate.toFixed(6))])]
      .sort((a, b) => a - b);

    el('wholeGlobalCompareBody').innerHTML = rates.map((r) => {
      const c = simulateGlobal(base, r);
      const active = Math.abs(r - rate) < 0.000001 ? 'active' : '';
      return '<tr class="' + active + '">' +
        '<td>' + percent(r) + '</td>' +
        '<td>' + money(c.desagioTotal) + '</td>' +
        '<td>' + money(c.brutoAcordo) + '</td>' +
        '<td>' + money(c.honorariosAdvogado) + '</td>' +
        '<td>' + money(c.valorEmConta) + '</td>' +
        '<td>' + money(c.fgtsFinal) + '</td>' +
        '<td>' + money(c.totalEconomico) + '</td>' +
        '<td>' + percent(c.percentualRecebido) + '</td>' +
      '</tr>';
    }).join('');
    renderMemory(result);
  }

  document.querySelectorAll('#globalDiscountQuick [data-global-rate]').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      el('globalBaseDiscountRate').value = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
      }).format(Number(button.dataset.globalRate));
      render();
    });
  });

  WATCH_IDS.forEach((id) => {
    el(id).addEventListener('input', render);
    el(id).addEventListener('change', render);
  });

  el('globalBaseDiscountRate').addEventListener('blur', () => {
    el('globalBaseDiscountRate').value = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(selectedRate() * 100);
    render();
  });

  render();
})();
