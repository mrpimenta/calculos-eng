const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const calc = require('../settlement-core.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

function fakeControl(initialValue = '') {
  return {
    value: initialValue,
    textContent: '',
    innerHTML: '',
    className: '',
    dataset: {},
    listeners: {},
    addEventListener(name, fn) {
      (this.listeners[name] ||= []).push(fn);
    },
    setAttribute() {},
    emit(name) {
      (this.listeners[name] || []).forEach((fn) => fn());
    }
  };
}

function startApp() {
  const entries = {};
  const startingValues = {
    valorCorrigido: '100.000,00',
    juros: '20.000,00',
    fgtsCorrigido: '8.000,00',
    fgtsJuros: '2.000,00',
    liquidoOriginal: '105.000,00',
    advogadoPct: '14,00',
    globalBaseDiscountRate: '20,00'
  };

  const globalButtons = [15, 20, 30, 50].map((rate) => {
    const button = fakeControl();
    button.dataset.globalRate = String(rate);
    return button;
  });

  const document = {
    getElementById(id) {
      assert.ok(htmlIds.has(id), 'ID ausente no HTML: ' + id);
      return (entries[id] ||= fakeControl(startingValues[id] || ''));
    },
    querySelectorAll(selector) {
      if (selector === '#globalDiscountQuick [data-global-rate]') return globalButtons;
      if (selector === '[data-money]') {
        return [
          'valorCorrigido',
          'juros',
          'fgtsCorrigido',
          'fgtsJuros',
          'liquidoOriginal'
        ].map((id) => document.getElementById(id));
      }
      return [];
    }
  };

  let printCalls = 0;
  const sandbox = {
    document,
    window: {
      CalculosEngCalc: calc,
      print() { printCalls += 1; }
    }
  };
  for (const file of ['app.js', 'global-discount.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, {
      filename: file,
      timeout: 3000
    });
  }

  return {
    entries,
    globalButtons,
    printCalls: () => printCalls
  };
}

test('Pagamento à vista: 20% global e 14% sobre verbas + FGTS', () => {
  const { entries } = startApp();
  assert.equal(entries.settlementBank.textContent, 'R$ 70.560,00');
  assert.equal(entries.settlementFgts.textContent, 'R$ 8.000,00');
  assert.equal(entries.settlementTotal.textContent, 'R$ 78.560,00');
  assert.equal(entries.settlementFee.textContent, 'R$ 13.440,00');
  assert.equal(entries.settlementPct.textContent, '65,47%');
  assert.equal(entries.settlementTheoreticalPct.textContent, '68,8%');
  assert.equal(entries.wholeGlobalLawyerFgts.textContent, 'R$ 1.120,00');
  assert.match(entries.mainSettlementBadge.textContent, /À vista/);
  assert.match(entries.wholeGlobalCompareBody.innerHTML, /50%/);
  assert.match(entries.wholeGlobalMemory.innerHTML, /FGTS/);
});

test('Comparação sobre juros preservada somente à vista', () => {
  const { entries } = startApp();
  assert.match(entries.ruleBadge.textContent, /À vista.*70%/);
  assert.equal(entries.liquido.textContent, 'R$ 77.560,00');
  assert.equal(entries.fgtsFinal.textContent, 'R$ 8.600,00');
  assert.equal(entries.honorariosAdvogado.textContent, 'R$ 14.840,00');
  assert.equal(entries.totalEconomico.textContent, 'R$ 86.160,00');
  assert.match(entries.memory.innerHTML, /honorários/i);
});

test('Alterações dos percentuais são refletidas sem mudar o pagamento à vista', () => {
  const { entries, globalButtons, printCalls } = startApp();
  globalButtons.find((button) => button.dataset.globalRate === '50').emit('click');
  assert.equal(entries.settlementBank.textContent, 'R$ 44.100,00');
  assert.equal(entries.settlementFgts.textContent, 'R$ 5.000,00');
  assert.match(entries.mainSettlementBadge.textContent, /À vista/);

  entries.advogadoPct.value = '0,00';
  entries.advogadoPct.emit('input');
  assert.equal(entries.settlementBank.textContent, 'R$ 52.500,00');
  assert.equal(entries.settlementFee.textContent, 'R$ 0,00');
  assert.match(entries.ruleBadge.textContent, /À vista/);

  entries.printBtn.emit('click');
  assert.equal(printCalls(), 1);
});

test('Erro nos valores não gera resultados de acordo inválidos', () => {
  const { entries } = startApp();
  entries.fgtsCorrigido.value = '200.000,00';
  entries.fgtsCorrigido.emit('input');
  assert.match(entries.validation.innerHTML, /Revise os dados/);
  assert.equal(entries.settlementBank.textContent, '—');
  assert.equal(entries.liquido.textContent, '—');
  assert.match(entries.wholeGlobalWarning.textContent, /Confira os valores/);
});

test('Interface exclusivamente à vista, sem controles ou scripts de parcelamento', () => {
  assert.doesNotMatch(html, /\bparcelas\b|\bparcelamento\b|12x|14x|24x|taxaAnual|investment/i);
  assert.doesNotMatch(html, /id="parcelas"|id="scenarioQuick"|id="compareBody"/);
  assert.ok(html.indexOf('globalBaseDiscountRate') < html.indexOf('class="result-panel"'));
  assert.ok(html.indexOf('class="global-discount-analysis"') > html.indexOf('class="result-panel"'));

  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts, [
    'settlement-core.js',
    'app.js',
    'global-discount.js'
  ]);
  assert.match(html, /value="20,00"/);
  assert.match(html, /value="14,00"/);
});
