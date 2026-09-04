const $ = (id) => document.getElementById(id);

const fields = [
  'valorCorrigido','juros','fgtsCorrigido','fgtsJuros','liquidoOriginal',
  'brutoPagina','fgtsPagina','honorarios','multas','taxaAnual'
];

const requiredIds = ['valorCorrigido','juros','fgtsCorrigido','fgtsJuros','liquidoOriginal'];

function parseBR(value) {
  if (typeof value !== 'string') return Number(value) || 0;
  const s = value.trim().replace(/\s/g, '').replace(/R\$/gi, '');
  if (!s) return 0;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function fmtInput(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function pct(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 }).format(value);
}

function getRule(n) {
  if (n === 1) return { rate: 0.70, label: 'À vista · 70% de deságio sobre juros e multas' };
  if (n <= 12) return { rate: 0.50, label: `${n}x · 50% de deságio sobre juros e multas` };
  return { rate: 0.30, label: `${n}x · 30% de deságio sobre juros e multas` };
}

function inputs() {
  return {
    valorCorrigido: parseBR($('valorCorrigido').value),
    juros: parseBR($('juros').value),
    fgtsCorrigido: parseBR($('fgtsCorrigido').value),
    fgtsJuros: parseBR($('fgtsJuros').value),
    liquidoOriginal: parseBR($('liquidoOriginal').value),
    brutoPagina: parseBR($('brutoPagina').value),
    fgtsPagina: parseBR($('fgtsPagina').value),
    honorarios: parseBR($('honorarios').value),
    multas: parseBR($('multas').value),
    taxaAnual: parseBR($('taxaAnual').value) / 100,
    parcelas: Number($('parcelas').value || 1)
  };
}

function requiredFilledCount() {
  return requiredIds.filter(id => $(id).value.trim() !== '').length;
}

function isComplete() {
  return requiredFilledCount() === requiredIds.length;
}

function simulate(base, parcelas) {
  const rule = getRule(parcelas);

  const jurosDiretos = Math.max(0, base.juros - base.fgtsJuros);
  const baseDiretaDesagio = jurosDiretos + base.multas;
  const desagioDireto = baseDiretaDesagio * rule.rate;

  const desagioFGTS = base.fgtsJuros * rule.rate;
  const desagioTotal = desagioDireto + desagioFGTS;

  const liquidoDireto = Math.max(0, base.liquidoOriginal - desagioDireto);
  const fgtsFinal = Math.max(0, base.fgtsCorrigido + base.fgtsJuros - desagioFGTS);
  const totalEconomico = liquidoDireto + fgtsFinal;

  const brutoOriginalCalculado = base.valorCorrigido + base.juros + base.multas;
  const brutoAcordo = Math.max(0, brutoOriginalCalculado - desagioTotal);
  const parcelaMedia = liquidoDireto / parcelas;

  const taxaMensal = base.taxaAnual > -1 ? Math.pow(1 + base.taxaAnual, 1 / 12) - 1 : 0;
  let valorPresente = liquidoDireto;
  if (parcelas > 1 && taxaMensal > 0) {
    valorPresente = 0;
    for (let i = 1; i <= parcelas; i++) {
      valorPresente += parcelaMedia / Math.pow(1 + taxaMensal, i);
    }
  }

  return {
    parcelas,
    ...rule,
    jurosDiretos,
    baseDiretaDesagio,
    desagioDireto,
    desagioFGTS,
    desagioTotal,
    liquidoDireto,
    fgtsFinal,
    totalEconomico,
    brutoOriginalCalculado,
    brutoAcordo,
    parcelaMedia,
    valorPresente
  };
}

function difference(a, b) {
  return Math.abs(a - b);
}

function renderProgress() {
  $('requiredProgress').textContent = `${requiredFilledCount()}/${requiredIds.length}`;
}

function renderValidation(base) {
  const box = $('validation');

  if (!isComplete()) {
    const missing = requiredIds.length - requiredFilledCount();
    box.className = 'validation validation--neutral';
    box.innerHTML = `<strong>Faltam ${missing} ${missing === 1 ? 'dado essencial' : 'dados essenciais'}.</strong> Continue copiando a primeira página do cálculo.`;
    return;
  }

  const checks = [];
  if (base.fgtsJuros > base.juros) {
    checks.push('⚠ Os juros do FGTS não podem ser maiores que os juros totais.');
  }

  if (base.brutoPagina > 0) {
    const expected = base.valorCorrigido + base.juros;
    const diff = difference(expected, base.brutoPagina);
    const ok = diff <= 0.05;
    checks.push(`${ok ? '✓' : '⚠'} Bruto: ${ok ? 'confere' : `diferença de ${fmt(diff)}`}`);
  }

  if (base.fgtsPagina > 0) {
    const expected = base.fgtsCorrigido + base.fgtsJuros;
    const diff = difference(expected, base.fgtsPagina);
    const ok = diff <= 0.05;
    checks.push(`${ok ? '✓' : '⚠'} FGTS: ${ok ? 'confere' : `diferença de ${fmt(diff)}`}`);
  }

  if (!checks.length) {
    box.className = 'validation validation--success';
    box.innerHTML = '<strong>Dados essenciais completos.</strong> A comparação de cenários está pronta. Você pode preencher as conferências opcionais para validar a digitação.';
    return;
  }

  const hasWarning = checks.some(x => x.startsWith('⚠'));
  box.className = `validation validation--${hasWarning ? 'warning' : 'success'}`;
  box.innerHTML = `<strong>Conferência automática:</strong> ${checks.join(' · ')}`;
}

function clearResults() {
  ['liquido','parcelaMedia','fgtsFinal','desagio','totalEconomico','valorPresente','originalValue','directReduction']
    .forEach(id => $(id).textContent = '—');

  $('compareBody').innerHTML = '<tr><td colspan="7" class="empty-row">Preencha os dados essenciais para comparar as modalidades.</td></tr>';
  $('memory').innerHTML = '<div class="memory-item"><span>Memória de cálculo</span><strong>Complete os dados essenciais para gerar a memória.</strong></div>';
}

function renderScenarioButtons(parcelas) {
  document.querySelectorAll('#scenarioQuick [data-parcelas]').forEach(button => {
    const active = Number(button.dataset.parcelas) === parcelas;
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

function render() {
  const base = inputs();
  const r = simulate(base, base.parcelas);

  renderProgress();
  renderValidation(base);
  renderScenarioButtons(base.parcelas);
  $('ruleBadge').textContent = r.label;

  if (!isComplete()) {
    clearResults();
    return;
  }

  $('liquido').textContent = fmt(r.liquidoDireto);
  $('parcelaMedia').textContent = fmt(r.parcelaMedia);
  $('fgtsFinal').textContent = fmt(r.fgtsFinal);
  $('desagio').textContent = fmt(r.desagioTotal);
  $('totalEconomico').textContent = fmt(r.totalEconomico);
  $('valorPresente').textContent = fmt(r.valorPresente);
  $('originalValue').textContent = fmt(base.liquidoOriginal);
  $('directReduction').textContent = fmt(r.desagioDireto);

  const options = [...new Set([1, 12, 13, 14, 24, base.parcelas])].sort((a,b)=>a-b);
  $('compareBody').innerHTML = options.map(n => {
    const x = simulate(base, n);
    return `<tr class="${n === base.parcelas ? 'active' : ''}">
      <td>${n === 1 ? 'À vista' : `${n} parcelas`}</td>
      <td>${pct(x.rate)}</td>
      <td>${fmt(x.liquidoDireto)}</td>
      <td>${fmt(x.parcelaMedia)}</td>
      <td>${fmt(x.fgtsFinal)}</td>
      <td>${fmt(x.totalEconomico)}</td>
      <td>${fmt(x.valorPresente)}</td>
    </tr>`;
  }).join('');

  const items = [
    ['Líquido original informado', base.liquidoOriginal],
    ['Juros totais da 1ª tabela', base.juros],
    ['Juros do FGTS', base.fgtsJuros],
    ['Juros ligados ao pagamento direto', r.jurosDiretos],
    ['Multas sujeitas a deságio', base.multas],
    [`Deságio no pagamento direto (${pct(r.rate)})`, r.desagioDireto],
    [`Deságio no FGTS (${pct(r.rate)})`, r.desagioFGTS],
    ['Deságio total', r.desagioTotal],
    ['Total direto após deságio', r.liquidoDireto],
    ['FGTS após deságio', r.fgtsFinal],
    ['Total econômico (direto + FGTS)', r.totalEconomico],
    ['Honorários informados (informativo)', base.honorarios]
  ];

  $('memory').innerHTML = items
    .map(([label, value]) => `<div class="memory-item"><span>${label}</span><strong>${fmt(value)}</strong></div>`)
    .join('');
}

function initParcelas() {
  $('parcelas').innerHTML = Array.from({length: 24}, (_,i) => i + 1)
    .map(n => `<option value="${n}" ${n===12?'selected':''}>${n === 1 ? '1 — à vista' : `${n} parcelas`}</option>`)
    .join('');
}

function initMoneyFormatting() {
  document.querySelectorAll('[data-money]').forEach(input => {
    input.addEventListener('blur', () => {
      if (!input.value.trim()) return;
      const value = parseBR(input.value);
      input.value = fmtInput(value);
      render();
    });
  });
}

function initQuickScenarios() {
  document.querySelectorAll('#scenarioQuick [data-parcelas]').forEach(button => {
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
fields.forEach(id => $(id).addEventListener('input', render));
$('parcelas').addEventListener('change', render);
$('printBtn').addEventListener('click', () => window.print());
render();
