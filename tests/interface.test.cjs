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

test('Interface conecta três módulos: à vista 20% global, 14% verbas + FGTS', () => {
  const entries = {};
  const startingValues = {
    valorCorrigido: '100.000,00', juros: '20.000,00',
    fgtsCorrigido: '8.000,00', fgtsJuros: '2.000,00',
    liquidoOriginal: '105.000,00', advogadoPct: '14,00',
    globalBaseDiscountRate: '20,00', taxaAnual: '15,00', parcelas: '1'
  };
  const buttonsGlobal = [15, 20, 30, 50].map((rate) => {
    const button = fakeControl();
    button.dataset.globalRate = String(rate);
    return button;
  });
  const buttonsInterest = [1, 12, 14, 24].map((n) => {
    const button = fakeControl();
    button.dataset.parcelas = String(n);
    return button;
  });

  const document = {
    getElementById(id) {
      assert.ok(htmlIds.has(id), 'ID ausente no HTML: ' + id);
      return (entries[id] ||= fakeControl(startingValues[id] || ''));
    },
    querySelectorAll(selector) {
      if (selector === '#globalDiscountQuick [data-global-rate]') return buttonsGlobal;
      if (selector === '#scenarioQuick [data-parcelas]') return buttonsInterest;
      if (selector === '[data-money]') {
        return ['valorCorrigido', 'juros', 'fgtsCorrigido', 'fgtsJuros', 'liquidoOriginal']
          .map((id) => document.getElementById(id));
      }
      return [];
    }
  };
  const sandbox = {
    document,
    window: { CalculosEngCalc: calc, print() {} }
  };
  for (const file of ['app.js', 'global-discount.js', 'investment.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox, {
      filename: file, timeout: 3000
    });
  }

  assert.equal(entries.settlementBank.textContent, 'R$ 70.560,00');
  assert.equal(entries.settlementFgts.textContent, 'R$ 8.000,00');
  assert.equal(entries.settlementTotal.textContent, 'R$ 78.560,00');
  assert.equal(entries.settlementFee.textContent, 'R$ 13.440,00');
  assert.equal(entries.settlementPct.textContent, '65,47%');
  assert.equal(entries.settlementTheoreticalPct.textContent, '68,8%');
  assert.equal(entries.wholeGlobalLawyerFgts.textContent, 'R$ 1.120,00');
  assert.match(entries.mainSettlementBadge.textContent, /À vista/);
  assert.match(entries.wholeGlobalCompareBody.innerHTML, /50%/);
  assert.match(entries.compareBody.innerHTML, /parcelas/);
  assert.match(entries.investmentBody.innerHTML, /R\$/);
  assert.match(entries.wholeGlobalMemory.innerHTML, /FGTS/);

  buttonsGlobal.find((button) => button.dataset.globalRate === '50').emit('click');
  assert.equal(entries.settlementBank.textContent, 'R$ 44.100,00');
  assert.equal(entries.settlementFgts.textContent, 'R$ 5.000,00');

  entries.advogadoPct.value = '0,00';
  entries.advogadoPct.emit('input');
  assert.equal(entries.settlementBank.textContent, 'R$ 52.500,00');
  assert.equal(entries.settlementFee.textContent, 'R$ 0,00');
});

test('Módulos do HTML têm as dependências declaradas em ordem', () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts, [
    'settlement-core.js', 'app.js', 'global-discount.js', 'investment.js'
  ]);
  assert.ok(html.indexOf('class="global-discount-analysis"') < html.indexOf('class="comparison"'));
  assert.match(html, /value="20,00"/);
});
