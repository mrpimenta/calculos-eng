const $ = (id) => document.getElementById(id);

const requiredIds = [
  'valorCorrigido',
  'juros',
  'fgtsCorrigido',
  'fgtsJuros',
  'liquidoOriginal'
];

const fields = [...requiredIds, 'taxaAnual', 'advogadoPct'];

function parseBR(value) {
  if (typeof value !== 'string') return Number(value) || 0;
  const s = value.trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (!s) return 0;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

function fmtInput(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function pct(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    maximumFractionDigits: 2
  }).format(value);
}

function getRule(parcelas) {
  if (parcelas === 1) {
    return { rate: 0.70, label: 'À vista · 70% de deságio sobre juros' };
  }
  if (parcelas <= 12) {
    return { rate: 0.50, label: `${parcelas}x · 50% de deságio sobre juros` };
  }
  return { rate: 0.30, label: `${parcelas}x · 30% de deságio sobre juros` };
}

function inputs() {
  return {
    valorCorrigido: parseBR($('valorCorrigido').value),
    juros: parseBR($('juros').value),
    fgtsCorrigido: parseBR($('fgtsCorrigido').value),
    fgtsJuros: parseBR($('fgtsJuros').value),
    liquidoOriginal: parseBR($('liquidoOriginal').value),
    taxaAnual: parseBR($('taxaAnual').value) / 100,
    advogadoPct: Math.max(0, parseBR($('advogadoPct').value) / 100),
    parcelas: Number($('parcelas').value || 1)
  };
}

function requiredFilledCount() {
  return requiredIds.filter((id) => $(id).value.trim() !== '').length;
}

function isComplete() {
  return requiredFilledCount() === requiredIds.length;
}

function simulate(base, parcelas) {
  const rule = getRule(parcelas);
  const jurosDiretos = Math.max(0, base.juros - base.fgtsJuros);
  const desagioDireto = jurosDiretos * rule.rate;
  const desagioFGTS = base.fgtsJuros * rule.rate;
  const desagioTotal = desagioDireto + desagioFGTS;

  const brutoOriginal = base.valorCorrigido + base.juros;
  const brutoAcordo = Math.max(0, brutoOriginal - desagioTotal);

  const liquidoAntesAdvogado = Math.max(0, base.liquidoOriginal - desagioDireto);
  const honorariosAdvogado = liquidoAntesAdvogado * base.advogadoPct;
  const liquidoFinal = Math.max(0, liquidoAntesAdvogado - honorariosAdvogado);

  const fgtsOriginal = base.fgtsCorrigido + base.fgtsJuros;
  const fgtsFinal = Math.max(0, fgtsOriginal - desagioFGTS);
  const totalEconomico = liquidoFinal + fgtsFinal;
  const parcelaMedia = parcelas > 0 ? liquidoFinal / parcelas : 0;

  const taxaMensal = base.taxaAnual > -1
    ? Math.pow(1 + base.taxaAnual, 1 / 12) - 1
    : 0;

  let valorPresente = liquidoFinal;
  if (parcelas > 1 && taxaMensal > 0) {
    valorPresente = 0;
    for (let i = 1; i <= parcelas; i += 1) {
      valorPresente += parcelaMedia / Math.pow(1 + taxaMensal, i);
    }
  }

  return {
    parcelas,
    ...rule,
    jurosDiretos,
    desagioDireto,
    desagioFGTS,
    desagioTotal,
    brutoOriginal,
    brutoAcordo,
    liquidoAntesAdvogado,
    honorariosAdvogado,
    liquidoFinal,
    fgtsOriginal,
    fgtsFinal,
    totalEconomico,
    parcelaMedia,
    valorPresente
  };
}

function renderProgress() {
  $('requiredProgress').textContent = `${requiredFilledCount()}/${requiredIds.length}`;
}

function renderValidation(base) {
  const box = $('validation');

  if (!isComplete()) {
    const missing = requiredIds.length - requiredFilledCount();
    box.className = 'validation validation--neutral';
    box.innerHTML = `<strong>Faltam ${missing} ${missing === 1 ? 'campo' : 'campos'}.</strong> Copie somente os valores indicados na página 1 do cálculo.`;
    return;
  }

  const warnings = [];
  if (base.fgtsJuros > base.juros) {
    warnings.push('Os juros do FGTS estão maiores que os juros totais. Confira os dois campos.');
  }
  if (base.fgtsCorrigido > base.valorCorrigido) {
    warnings.push('O valor corrigido do FGTS está maior que o valor corrigido total. Confira a digitação.');
  }
  if (base.advogadoPct > 1) {
    warnings.push('O desconto do advogado está acima de 100%. Confira o percentual.');
  }

  if (warnings.length) {
    box.className = 'validation validation--warning';
    box.innerHTML = `<strong>Confira antes de usar a simulação.</strong> ${warnings.join(' ')}`;
    return;
  }

  box.className = 'validation validation--success';
  box.innerHTML = `<strong>Dados completos.</strong> A comparação já considera ${pct(base.advogadoPct)} de desconto do advogado.`;
}

function clearResults() {
  [
    'liquido',
    'preLawyerValue',
    'parcelaMedia',
    'honorariosAdvogado',
    'fgtsFinal',
    'desagio',
    'brutoAcordo',
    'totalEconomico',
    'valorPresente'
  ].forEach((id) => { $(id).textContent = '—'; });

  $('originalValue').textContent = $('liquidoOriginal').value.trim()
    ? fmt(parseBR($('liquidoOriginal').value))
    : '—';

  $('compareBody').innerHTML = '<tr><td colspan="7" class="empty-row">Preencha os cinco valores para comparar as modalidades.</td></tr>';
  $('memory').innerHTML = '';
}

function renderScenarioButtons(parcelas) {
  document.querySelectorAll('#scenarioQuick [data-parcelas]').forEach((button) => {
    const active = Number(button.dataset.parcelas) === parcelas;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function render() {
  const base = inputs();
  renderProgress();
  renderValidation(base);
  renderScenarioButtons(base.parcelas);

  if (!isComplete()) {
    $('ruleBadge').textContent = 'Aguardando preenchimento';
    clearResults();
    return;
  }

  const result = simulate(base, base.parcelas);
  $('ruleBadge').textContent = `${result.label} · advogado ${pct(base.advogadoPct)}`;
  $('liquido').textContent = fmt(result.liquidoFinal);
  $('preLawyerValue').textContent = fmt(result.liquidoAntesAdvogado);
  $('originalValue').textContent = fmt(base.liquidoOriginal);
  $('parcelaMedia').textContent = fmt(result.parcelaMedia);
  $('honorariosAdvogado').textContent = fmt(result.honorariosAdvogado);
  $('fgtsFinal').textContent = fmt(result.fgtsFinal);
  $('desagio').textContent = fmt(result.desagioTotal);
  $('brutoAcordo').textContent = fmt(result.brutoAcordo);
  $('totalEconomico').textContent = fmt(result.totalEconomico);
  $('valorPresente').textContent = fmt(result.valorPresente);

  const options = [...new Set([1, 12, 13, 14, 24, base.parcelas])]
    .sort((a, b) => a - b);

  $('compareBody').innerHTML = options.map((n) => {
    const scenario = simulate(base, n);
    return `<tr class="${n === base.parcelas ? 'active' : ''}">
      <td>${n === 1 ? 'À vista' : `${n} parcelas`}</td>
      <td>${pct(scenario.rate)}</td>
      <td>${fmt(scenario.honorariosAdvogado)}</td>
      <td>${fmt(scenario.liquidoFinal)}</td>
      <td>${fmt(scenario.parcelaMedia)}</td>
      <td>${fmt(scenario.fgtsFinal)}</td>
      <td>${fmt(scenario.valorPresente)}</td>
    </tr>`;
  }).join('');

  const items = [
    ['“Total” → Valor Corrigido', base.valorCorrigido],
    ['“Total” → Juros', base.juros],
    ['“FGTS 8%” → Valor Corrigido', base.fgtsCorrigido],
    ['“FGTS 8%” → Juros', base.fgtsJuros],
    ['Líquido Devido ao Reclamante', base.liquidoOriginal],
    ['Juros ligados ao pagamento direto', result.jurosDiretos],
    [`Deságio APS no pagamento direto (${pct(result.rate)})`, result.desagioDireto],
    [`Deságio APS no FGTS (${pct(result.rate)})`, result.desagioFGTS],
    ['Deságio APS total', result.desagioTotal],
    ['Recebimento direto após deságio e antes do advogado', result.liquidoAntesAdvogado],
    [`Honorários contratuais do advogado (${pct(base.advogadoPct)})`, result.honorariosAdvogado],
    ['Líquido final após advogado', result.liquidoFinal],
    ['FGTS após deságio', result.fgtsFinal],
    ['Total econômico final (líquido + FGTS)', result.totalEconomico],
    ['Bruto do crédito após deságio', result.brutoAcordo]
  ];

  $('memory').innerHTML = items
    .map(([label, value]) => `<div class="memory-item"><span>${label}</span><strong>${fmt(value)}</strong></div>`)
    .join('');
}

function initParcelas() {
  $('parcelas').innerHTML = Array.from({ length: 24 }, (_, i) => i + 1)
    .map((n) => `<option value="${n}" ${n === 12 ? 'selected' : ''}>${n === 1 ? '1 — à vista' : `${n} parcelas`}</option>`)
    .join('');
}

function initMoneyFormatting() {
  document.querySelectorAll('[data-money]').forEach((input) => {
    input.addEventListener('blur', () => {
      if (!input.value.trim()) return;
      input.value = fmtInput(parseBR(input.value));
      render();
    });
  });
}

function initQuickScenarios() {
  document.querySelectorAll('#scenarioQuick [data-parcelas]').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      $('parcelas').value = button.dataset.parcelas;
      render();
    });
  });
}

initParcelas();
initMoneyFormatting();
initQuickScenarios();
fields.forEach((id) => $(id).addEventListener('input', render));
$('parcelas').addEventListener('change', render);
$('printBtn').addEventListener('click', () => window.print());
render();
