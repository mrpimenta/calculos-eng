'use strict';

// Os dois métodos são à vista. Este módulo mantém apenas a comparação
// alternativa de deságio sobre juros; o acordo global é o resultado principal.
const $ = (id) => document.getElementById(id);

const requiredIds = [
  'valorCorrigido',
  'juros',
  'fgtsCorrigido',
  'fgtsJuros',
  'liquidoOriginal'
];
const watchedIds = [...requiredIds, 'advogadoPct'];

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

function fmtInput(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
}

function percent(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    maximumFractionDigits: 2
  }).format(value || 0);
}

function readBase() {
  return {
    valorCorrigido: parseBR($('valorCorrigido').value),
    juros: parseBR($('juros').value),
    fgtsCorrigido: parseBR($('fgtsCorrigido').value),
    fgtsJuros: parseBR($('fgtsJuros').value),
    liquidoOriginal: parseBR($('liquidoOriginal').value),
    advogadoPct: Math.min(1, Math.max(0, parseBR($('advogadoPct').value) / 100))
  };
}

function filledCount() {
  return requiredIds.filter((id) => $(id).value.trim() !== '').length;
}

function isComplete() {
  return filledCount() === requiredIds.length;
}

function renderProgress() {
  $('requiredProgress').textContent = filledCount() + '/' + requiredIds.length;
}

function renderValidation(base) {
  const box = $('validation');

  if (!isComplete()) {
    const missing = requiredIds.length - filledCount();
    box.className = 'validation validation--neutral';
    box.innerHTML = '<strong>Faltam ' + missing + ' ' +
      (missing === 1 ? 'campo' : 'campos') +
      '.</strong> Copie somente os valores indicados na página 1 do cálculo.';
    return false;
  }

  const warnings = [];
  if (requiredIds.some((id) => base[id] < 0)) {
    warnings.push('Os valores monetários não podem ser negativos.');
  }
  if (base.fgtsJuros > base.juros) {
    warnings.push('Os juros do FGTS superam os juros totais.');
  }
  if (base.fgtsCorrigido > base.valorCorrigido) {
    warnings.push('O FGTS corrigido supera o valor corrigido total.');
  }
  if (base.fgtsCorrigido + base.fgtsJuros + base.liquidoOriginal >
      base.valorCorrigido + base.juros + 0.01) {
    warnings.push('A soma do FGTS e do líquido supera o crédito bruto.');
  }
  const pctAdv = parseBR($('advogadoPct').value);
  if (pctAdv < 0 || pctAdv > 100) {
    warnings.push('O percentual do advogado deve ficar entre 0% e 100%.');
  }

  if (warnings.length) {
    box.className = 'validation validation--warning';
    box.innerHTML = '<strong>Revise os dados.</strong> ' + warnings.join(' ');
    return false;
  }
  box.className = 'validation validation--success';
  box.innerHTML = '<strong>Dados completos.</strong> Pagamento à vista. ' +
    'A proposta principal usa deságio global e honorários sobre verbas e FGTS.';
  return true;
}

function clearAlternative() {
  [
    'liquido', 'preLawyerValue', 'honorariosAdvogado',
    'fgtsFinal', 'desagio', 'brutoAcordo', 'totalEconomico'
  ].forEach((id) => { $(id).textContent = '—'; });

  $('originalValue').textContent = $('liquidoOriginal').value.trim()
    ? money(parseBR($('liquidoOriginal').value))
    : '—';
  $('memory').innerHTML = '';
}

function renderAlternative(base) {
  const rate = 0.70; // Comparativo sobre juros também é sempre à vista.
  const r = window.CalculosEngCalc.simularAcordo(base, rate, 'juros');

  $('ruleBadge').textContent = 'À vista · ' + percent(rate) +
    ' de deságio sobre juros · advogado ' + percent(base.advogadoPct) +
    ' sobre verbas e FGTS';
  $('liquido').textContent = money(r.valorEmConta);
  $('preLawyerValue').textContent = money(r.liquidoAntesAdvogado);
  $('originalValue').textContent = money(base.liquidoOriginal);
  $('honorariosAdvogado').textContent = money(r.honorariosAdvogado);
  $('fgtsFinal').textContent = money(r.fgtsFinal);
  $('desagio').textContent = money(r.desagioTotal);
  $('brutoAcordo').textContent = money(r.brutoAcordo);
  $('totalEconomico').textContent = money(r.totalEconomico);

  const items = [
    ['Valor Corrigido original', base.valorCorrigido],
    ['Juros totais originais', base.juros],
    ['FGTS original corrigido', base.fgtsCorrigido],
    ['Juros originais do FGTS', base.fgtsJuros],
    ['Líquido original do reclamante', base.liquidoOriginal],
    ['Deságio sobre juros do pagamento direto', r.desagioDireto],
    ['Deságio sobre juros do FGTS', r.desagioFGTS],
    ['Total do deságio sobre juros', r.desagioTotal],
    ['Crédito bruto após deságio', r.brutoAcordo],
    ['Base de honorários (verbas + FGTS)', r.baseHonorarios],
    ['Honorários totais', r.honorariosAdvogado],
    ['Honorários sobre FGTS pagos a partir do crédito direto', r.honorariosSobreFGTS],
    ['Líquido bancário à vista', r.valorEmConta],
    ['FGTS vinculado', r.fgtsFinal],
    ['Total econômico do comparativo à vista', r.totalEconomico]
  ];

  $('memory').innerHTML = items.map(([label, value]) =>
    '<div class="memory-item"><span>' + label +
    '</span><strong>' + money(value) + '</strong></div>'
  ).join('');
}

function render() {
  const base = readBase();
  renderProgress();

  if (!renderValidation(base)) {
    $('ruleBadge').textContent = isComplete()
      ? 'Verifique os dados da planilha'
      : 'Aguardando preenchimento';
    clearAlternative();
    return;
  }

  try {
    renderAlternative(base);
  } catch (error) {
    $('ruleBadge').textContent = 'Verifique os valores informados';
    clearAlternative();
    $('validation').className = 'validation validation--warning';
    $('validation').textContent = 'Não foi possível calcular: ' + error.message;
  }
}

document.querySelectorAll('[data-money]').forEach((input) => {
  input.addEventListener('blur', () => {
    if (!input.value.trim()) return;
    input.value = fmtInput(parseBR(input.value));
    render();
  });
});

watchedIds.forEach((id) => $(id).addEventListener('input', render));
$('printBtn').addEventListener('click', () => window.print());
render();
