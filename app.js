'use strict';

(() => {
  const ids = ['valorCorrigido', 'juros', 'fgtsCorrigido', 'fgtsJuros', 'liquidoOriginal'];
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(value);
  const formatInput = (value) => new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(value);
  const percent = (value) => new Intl.NumberFormat('pt-BR', {
    style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2
  }).format(value);

  const outputIds = [
    'resultBank', 'resultFGTS', 'resultTotal', 'resultPercent',
    'resultGross', 'resultDiscount', 'resultGrossAfter',
    'resultFeeBase', 'resultFee', 'resultFeeFGTS',
    'resultDirectBeforeFee', 'resultTaxEstimate', 'resultPercentGross'
  ];

  function parseBR(value) {
    const s = String(value).trim().replace(/^R\$\s*/, '').replace(/\s/g, '');
    if (!s || !/^\d[\d.,]*$/.test(s)) {
      throw new RangeError('Use números positivos em reais (por exemplo: 1.234,56).');
    }

    let n;
    if (s.includes(',')) {
      if (s.split(',').length !== 2 || !/,\d{1,2}$/.test(s)) {
        throw new RangeError('Use no máximo duas casas decimais.');
      }
      n = Number(s.replace(/\./g, '').replace(',', '.'));
    } else if ((s.match(/\./g) || []).length === 1 && /\.\d{1,2}$/.test(s)) {
      n = Number(s); // Também aceita 1234.56 sem separador de milhar.
    } else {
      n = Number(s.replace(/\./g, ''));
    }

    if (!Number.isFinite(n) || n < 0) {
      throw new RangeError('Confira os valores monetários informados.');
    }
    return n;
  }

  function filledCount() {
    return ids.filter((id) => $(id).value.trim() !== '').length;
  }

  function clearResults() {
    outputIds.forEach((id) => { $(id).textContent = '—'; });
    $('balanceWarning').textContent = '';
    $('memory').innerHTML =
      '<p class="memory-empty">Preencha os cinco valores para visualizar a memória.</p>';
  }

  function renderMemory(r) {
    const rows = [
      ['Crédito bruto original (verbas + FGTS)', r.brutoOriginal],
      ['FGTS original', r.fgtsOriginal],
      ['Líquido direto original do Blanco', r.liquidoOriginal],
      ['Descontos já considerados no Blanco', r.descontosOriginais],
      ['Deságio global da APS — 20%', -r.desagioGlobal],
      ['Crédito bruto remanescente após o deságio', r.brutoAposDesagio],
      ['Verbas brutas remanescentes sem FGTS', r.verbasBrutasAposDesagio],
      ['FGTS destinado à conta vinculada após deságio', r.fgtsVinculado],
      ['Líquido direto antes dos honorários (estimado)', r.liquidoAntesHonorarios],
      ['Descontos originais proporcionalizados (sem recalcular IR/INSS)', r.descontosProporcionais],
      ['Base dos honorários (verbas + FGTS após deságio)', r.baseHonorarios],
      ['Honorários sobre as verbas', -r.honorariosSobreVerbas],
      ['Honorários sobre o FGTS, abatidos do crédito direto', -r.honorariosSobreFGTS],
      ['Honorários contratuais totais — 14%', -r.honorariosTotais],
      ['Depósito estimado na conta bancária, à vista', r.naConta],
      ['FGTS na conta vinculada', r.fgtsVinculado],
      ['Total econômico líquido (bancário + FGTS)', r.totalEconomico]
    ];
    $('memory').innerHTML = rows.map(([label, amount]) =>
      '<div class="memory-item"><span>' + label + '</span><strong>' +
      money(amount) + '</strong></div>'
    ).join('');
  }

  function render() {
    const count = filledCount();
    $('requiredProgress').textContent = count + '/5';
    const validation = $('validation');
    if (count < ids.length) {
      clearResults();
      validation.className = 'validation validation--neutral';
      validation.textContent = 'Faltam ' + (ids.length - count) +
        ((ids.length - count) === 1 ? ' campo.' : ' campos.') +
        ' Complete os cinco valores do Blanco.';
      return;
    }

    try {
      const base = {};
      ids.forEach((id) => { base[id] = parseBR($(id).value); });
      const r = window.CalculosEngCalc.calcularAcordo(base);
      const values = {
        resultBank: money(r.naConta),
        resultFGTS: money(r.fgtsVinculado),
        resultTotal: money(r.totalEconomico),
        resultPercent: percent(r.percentualTotal),
        resultGross: money(r.brutoOriginal),
        resultDiscount: money(r.desagioGlobal),
        resultGrossAfter: money(r.brutoAposDesagio),
        resultFeeBase: money(r.baseHonorarios),
        resultFee: money(r.honorariosTotais),
        resultFeeFGTS: money(r.honorariosSobreFGTS),
        resultDirectBeforeFee: money(r.liquidoAntesHonorarios),
        resultTaxEstimate: money(r.descontosProporcionais),
        resultPercentGross: percent(r.percentualTeorico)
      };
      Object.entries(values).forEach(([id, value]) => {
        $(id).textContent = value;
      });
      $('balanceWarning').textContent = r.honorariosPendentes > 0
        ? 'Atenção: o crédito direto não cobre todos os honorários. Saldo a quitar: ' +
          money(r.honorariosPendentes) + '. O total econômico já considera esse valor.'
        : '';

      validation.className = 'validation validation--success';
      validation.textContent = 'Dados conciliados. Cálculo efetuado com 20% de deságio global, 14% de honorários sobre verbas e FGTS e pagamento à vista.';
      renderMemory(r);
    } catch (error) {
      clearResults();
      validation.className = 'validation validation--warning';
      validation.textContent = 'Confira os cinco valores: ' + error.message;
    }
  }

  ids.forEach((id) => {
    const input = $(id);
    input.addEventListener('input', render);
    input.addEventListener('change', render);
    input.addEventListener('blur', () => {
      if (!input.value.trim()) return;
      try {
        input.value = formatInput(parseBR(input.value));
        render();
      } catch {
        // Mantém o texto digitado para que o usuário possa corrigi-lo.
      }
    });
  });

  $('clearBtn').addEventListener('click', () => {
    ids.forEach((id) => { $(id).value = ''; });
    render();
    $('valorCorrigido').focus();
  });
  $('printBtn').addEventListener('click', () => window.print());
  render();
})();
