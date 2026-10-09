const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const calc = require('../settlement-core.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const inputIds = ['valorCorrigido', 'juros', 'fgtsCorrigido', 'fgtsJuros', 'liquidoOriginal'];

function fakeElement(value = '') {
  return {
    value, textContent: '', innerHTML: '', className: '', focused: false,
    events: {},
    addEventListener(name, fn) { (this.events[name] ||= []).push(fn); },
    emit(name) { (this.events[name] || []).forEach((fn) => fn()); },
    focus() { this.focused = true; }
  };
}

function startApp() {
  const elements = {};
  const values = {
    valorCorrigido: '100.000,00',
    juros: '20.000,00',
    fgtsCorrigido: '8.000,00',
    fgtsJuros: '2.000,00',
    liquidoOriginal: '105.000,00'
  };
  const document = {
    getElementById(id) {
      assert.ok(htmlIds.has(id), 'ID não encontrado no HTML: ' + id);
      return (elements[id] ||= fakeElement(values[id] || ''));
    }
  };
  let printed = 0;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), {
    document,
    window: { CalculosEngCalc: calc, print() { printed += 1; } }
  }, { filename: 'app.js', timeout: 3000 });
  return { elements, printed: () => printed };
}

test('Tela apresenta exclusivamente as condições fechadas e campos do Blanco', () => {
  assert.match(html, /20%/);
  assert.match(html, /14%/);
  assert.match(html, /À vista/);
  assert.equal((html.match(/data-money/g) || []).length, 5);
  for (const id of inputIds) assert.ok(htmlIds.has(id));
  assert.doesNotMatch(html, /id="advogadoPct"|id="globalBaseDiscountRate"|data-global-rate/);
  assert.doesNotMatch(html, /id="parcelas"|id="scenarioQuick"|id="compareBody"/);
  assert.doesNotMatch(html, /investment|legacy-results|deságio somente sobre juros|comparação de cenários/i);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ['settlement-core.js', 'app.js']);
});

test('Interface mostra crédito bancário, FGTS e percentual do acordo fechado', () => {
  const { elements } = startApp();
  assert.equal(elements.requiredProgress.textContent, '5/5');
  assert.equal(elements.resultBank.textContent, 'R$ 70.560,00');
  assert.equal(elements.resultFGTS.textContent, 'R$ 8.000,00');
  assert.equal(elements.resultTotal.textContent, 'R$ 78.560,00');
  assert.equal(elements.resultPercent.textContent, '65,47%');
  assert.equal(elements.resultFee.textContent, 'R$ 13.440,00');
  assert.equal(elements.resultFeeFGTS.textContent, 'R$ 1.120,00');
  assert.equal(elements.resultPercentGross.textContent, '68,80%');
  assert.match(elements.memory.innerHTML, /14%/);
  assert.match(elements.validation.className, /success/);
});

test('Ao alterar um dado individual, os resultados são atualizados', () => {
  const { elements } = startApp();
  elements.valorCorrigido.value = '120.000,00';
  elements.liquidoOriginal.value = '125.000,00';
  elements.valorCorrigido.emit('input');
  assert.equal(elements.resultGross.textContent, 'R$ 140.000,00');
  assert.equal(elements.resultDiscount.textContent, 'R$ 28.000,00');
  assert.match(elements.validation.className, /success/);
});

test('Campo inválido apaga os resultados antigos e exibe o erro', () => {
  const { elements } = startApp();
  elements.fgtsCorrigido.value = '200.000,00';
  elements.fgtsCorrigido.emit('input');
  assert.match(elements.validation.className, /warning/);
  assert.equal(elements.resultBank.textContent, '—');
  assert.equal(elements.resultFGTS.textContent, '—');
  assert.equal(elements.resultPercent.textContent, '—');
});

test('Botões de imprimir e limpar funcionam', () => {
  const { elements, printed } = startApp();
  elements.printBtn.emit('click');
  assert.equal(printed(), 1);
  elements.clearBtn.emit('click');
  assert.equal(elements.requiredProgress.textContent, '0/5');
  assert.equal(elements.resultBank.textContent, '—');
  assert.equal(elements.valorCorrigido.value, '');
  assert.equal(elements.valorCorrigido.focused, true);
  assert.match(elements.validation.className, /neutral/);
});

test('Formatação brasileira é aplicada após sair de um campo válido', () => {
  const { elements } = startApp();
  elements.juros.value = '20000';
  elements.juros.emit('blur');
  assert.equal(elements.juros.value, '20.000,00');
});
