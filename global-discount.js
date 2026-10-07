(() => {
  const REQUIRED_IDS = [
    'valorCorrigido',
    'juros',
    'fgtsCorrigido',
    'fgtsJuros',
    'liquidoOriginal'
  ];

  const WATCH_IDS = [...REQUIRED_IDS, 'advogadoPct', 'globalBaseDiscountRate'];

  const el = (id) => document.getElementById(id);

  function parseBR(value) {
    if (typeof value !== 'string') return Number(value) || 0;
    const s = value.trim().replace(/\s/g, '').replace(/R\$/gi, '');
    if (!s) return 0;
    const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  function money(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  function percent(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      maximumFractionDigits: 2
    }).format(value || 0);
  }

  function isComplete() {
    return REQUIRED_IDS.every((id) => el(id) && el(id).value.trim() !== '');
  }

  function readBase() {
    return {
      valorCorrigido: parseBR(el('valorCorrigido').value),
      juros: parseBR(el('juros').value),
      fgtsCorrigido: parseBR(el('fgtsCorrigido').value),
      fgtsJuros: parseBR(el('fgtsJuros').value),
      liquidoOriginal: parseBR(el('liquidoOriginal').value),
      advogadoPct: Math.max(0, parseBR(el('advogadoPct').value) / 100)
    };
  }

  function simulateGlobal(base, rate) {
    const fatorPagamento = Math.max(0, 1 - rate);
    const brutoOriginal = base.valorCorrigido + base.juros;
    const desagioGlobal = brutoOriginal * rate;
    const brutoAcordo = brutoOriginal * fatorPagamento;

    // Estimativa proporcional: o mesmo fator de pagamento global é aplicado
    // ao líquido do reclamante e ao FGTS separado. Tributos não são recalculados.
    const liquidoAntesAdvogado = base.liquidoOriginal * fatorPagamento;
    const honorariosAdvogado = liquidoAntesAdvogado * base.advogadoPct;
    const liquidoFinal = Math.max(0, liquidoAntesAdvogado - honorariosAdvogado);

    const fgtsOriginal = base.fgtsCorrigido + base.fgtsJuros;
    const fgtsFinal = fgtsOriginal * fatorPagamento;
    const totalEconomico = liquidoFinal + fgtsFinal;

    return {
      rate,
      fatorPagamento,
      brutoOriginal,
      desagioGlobal,
      brutoAcordo,
      liquidoAntesAdvogado,
      honorariosAdvogado,
      liquidoFinal,
      fgtsOriginal,
      fgtsFinal,
      totalEconomico
    };
  }

  function clear() {
    [
      'wholeGlobalRate',
      'wholeGlobalDiscountAmount',
      'wholeGlobalGrossAfter',
      'wholeGlobalPreLawyer',
      'wholeGlobalLawyer',
      'wholeGlobalNet',
      'wholeGlobalFgts',
      'wholeGlobalEconomic'
    ].forEach((id) => {
      const node = el(id);
      if (node) node.textContent = '—';
    });

    const body = el('wholeGlobalCompareBody');
    if (body) {
      body.innerHTML = '<tr><td colspan="7" class="empty-row">Preencha os cinco valores do Blanco para comparar os descontos sobre o valor global.</td></tr>';
    }
  }

  function renderQuickButtons(rate) {
    document.querySelectorAll('#globalDiscountQuick [data-global-rate]').forEach((button) => {
      const active = Number(button.dataset.globalRate) === Math.round(rate * 100);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function render() {
    if (!isComplete()) {
      clear();
      return;
    }

    const base = readBase();
    const selectedRate = Math.max(0, parseBR(el('globalBaseDiscountRate').value) / 100);
    const result = simulateGlobal(base, selectedRate);

    el('wholeGlobalRate').textContent = percent(result.rate);
    el('wholeGlobalDiscountAmount').textContent = money(result.desagioGlobal);
    el('wholeGlobalGrossAfter').textContent = money(result.brutoAcordo);
    el('wholeGlobalPreLawyer').textContent = money(result.liquidoAntesAdvogado);
    el('wholeGlobalLawyer').textContent = money(result.honorariosAdvogado);
    el('wholeGlobalNet').textContent = money(result.liquidoFinal);
    el('wholeGlobalFgts').textContent = money(result.fgtsFinal);
    el('wholeGlobalEconomic').textContent = money(result.totalEconomico);

    renderQuickButtons(selectedRate);

    const rates = [0.15, 0.30, 0.50];
    el('wholeGlobalCompareBody').innerHTML = rates.map((rate) => {
      const scenario = simulateGlobal(base, rate);
      const active = Math.abs(rate - selectedRate) < 0.0001 ? 'active' : '';
      return `<tr class="${active}">
        <td>${percent(rate)}</td>
        <td>${percent(scenario.fatorPagamento)}</td>
        <td>${money(scenario.desagioGlobal)}</td>
        <td>${money(scenario.brutoAcordo)}</td>
        <td>${money(scenario.honorariosAdvogado)}</td>
        <td>${money(scenario.liquidoFinal)}</td>
        <td>${money(scenario.totalEconomico)}</td>
      </tr>`;
    }).join('');
  }

  document.querySelectorAll('#globalDiscountQuick [data-global-rate]').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      el('globalBaseDiscountRate').value = button.dataset.globalRate;
      render();
    });
  });

  WATCH_IDS.forEach((id) => {
    const node = el(id);
    if (!node) return;
    node.addEventListener('input', render);
    node.addEventListener('change', render);
    node.addEventListener('blur', render);
  });

  renderQuickButtons(parseBR(el('globalBaseDiscountRate').value) / 100);
  render();
})();