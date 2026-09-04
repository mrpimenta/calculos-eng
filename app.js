const $ = (id) => document.getElementById(id);

const fields = [
  'valorCorrigido','juros','multas','fgtsCorrigido','fgtsJuros','irpf','outrosDescontos','honorarios','taxaAnual'
];

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

function pct(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
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
    multas: parseBR($('multas').value),
    fgtsCorrigido: parseBR($('fgtsCorrigido').value),
    fgtsJuros: parseBR($('fgtsJuros').value),
    irpf: parseBR($('irpf').value),
    outrosDescontos: parseBR($('outrosDescontos').value),
    honorarios: parseBR($('honorarios').value),
    taxaAnual: parseBR($('taxaAnual').value) / 100,
    parcelas: Number($('parcelas').value || 1)
  };
}

function simulate(base, parcelas) {
  const rule = getRule(parcelas);
  const jurosMultas = base.juros + base.multas;
  const desagio = jurosMultas * rule.rate;
  const jurosMultasAcordo = jurosMultas - desagio;
  const brutoAcordo = base.valorCorrigido + jurosMultasAcordo;

  const fgtsDesagio = base.fgtsJuros * rule.rate;
  const fgtsFinal = base.fgtsCorrigido + (base.fgtsJuros - fgtsDesagio);
  const liquidoDireto = Math.max(0, brutoAcordo - fgtsFinal - base.irpf - base.outrosDescontos);
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
    jurosMultas,
    desagio,
    jurosMultasAcordo,
    brutoAcordo,
    fgtsDesagio,
    fgtsFinal,
    liquidoDireto,
    parcelaMedia,
    valorPresente
  };
}

function render() {
  const base = inputs();
  const r = simulate(base, base.parcelas);

  $('ruleBadge').textContent = r.label;
  $('liquido').textContent = fmt(r.liquidoDireto);
  $('parcelaMedia').textContent = fmt(r.parcelaMedia);
  $('fgtsFinal').textContent = fmt(r.fgtsFinal);
  $('desagio').textContent = fmt(r.desagio);
  $('brutoAcordo').textContent = fmt(r.brutoAcordo);
  $('valorPresente').textContent = fmt(r.valorPresente);

  const options = [...new Set([1, 12, 13, 14, 24, base.parcelas])].sort((a,b)=>a-b);
  $('compareBody').innerHTML = options.map(n => {
    const x = simulate(base, n);
    return `<tr class="${n === base.parcelas ? 'active' : ''}">
      <td>${n === 1 ? 'À vista' : `${n} parcelas`}</td>
      <td>${pct(x.rate)}</td>
      <td>${fmt(x.liquidoDireto)}</td>
      <td>${fmt(x.parcelaMedia)}</td>
      <td>${fmt(x.fgtsFinal)}</td>
      <td>${fmt(x.valorPresente)}</td>
    </tr>`;
  }).join('');

  const items = [
    ['Valor corrigido informado', base.valorCorrigido],
    ['Juros informados', base.juros],
    ['Multas informadas', base.multas],
    ['Base sujeita a deságio', r.jurosMultas],
    [`Deságio aplicado (${pct(r.rate)})`, r.desagio],
    ['Juros/multas após deságio', r.jurosMultasAcordo],
    ['Crédito bruto após acordo', r.brutoAcordo],
    ['FGTS após deságio nos juros', r.fgtsFinal],
    ['IRPF preservado', base.irpf],
    ['Outros descontos', base.outrosDescontos],
    ['Líquido direto estimado', r.liquidoDireto],
    ['Honorários informados (fora do líquido)', base.honorarios]
  ];
  $('memory').innerHTML = items.map(([label, value]) => `<div class="memory-item"><span>${label}</span><strong>${fmt(value)}</strong></div>`).join('');
}

function initParcelas() {
  $('parcelas').innerHTML = Array.from({length: 24}, (_,i) => i + 1)
    .map(n => `<option value="${n}" ${n===12?'selected':''}>${n === 1 ? '1 — à vista' : `${n} parcelas`}</option>`).join('');
}

initParcelas();
fields.forEach(id => $(id).addEventListener('input', render));
$('parcelas').addEventListener('change', render);
$('printBtn').addEventListener('click', () => window.print());
render();
