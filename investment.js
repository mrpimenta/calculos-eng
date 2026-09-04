(() => {
  const HORIZON_MONTHS = 24;
  const REQUIRED_IDS = [
    'valorCorrigido',
    'juros',
    'fgtsCorrigido',
    'fgtsJuros',
    'liquidoOriginal'
  ];

  const WATCH_IDS = [
    ...REQUIRED_IDS,
    'taxaAnual',
    'advogadoPct',
    'parcelas'
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

  function scenarioLabel(parcelas) {
    return parcelas === 1 ? 'À vista' : `${parcelas}x`;
  }

  function ruleFor(parcelas) {
    if (parcelas === 1) return 0.70;
    if (parcelas <= 12) return 0.50;
    return 0.30;
  }

  function readBase() {
    return {
      valorCorrigido: parseBR(el('valorCorrigido').value),
      juros: parseBR(el('juros').value),
      fgtsCorrigido: parseBR(el('fgtsCorrigido').value),
      fgtsJuros: parseBR(el('fgtsJuros').value),
      liquidoOriginal: parseBR(el('liquidoOriginal').value),
      taxaAnual: Math.max(0, parseBR(el('taxaAnual').value) / 100),
      advogadoPct: Math.max(0, parseBR(el('advogadoPct').value) / 100),
      parcelas: Number(el('parcelas').value || 1)
    };
  }

  function isComplete() {
    return REQUIRED_IDS.every((id) => el(id).value.trim() !== '');
  }

  function monthlyRate(annualRate) {
    if (annualRate <= 0) return 0;
    return Math.pow(1 + annualRate, 1 / 12) - 1;
  }

  function simulate(base, parcelas) {
    const rate = ruleFor(parcelas);
    const jurosDiretos = Math.max(0, base.juros - base.fgtsJuros);
    const desagioDireto = jurosDiretos * rate;
    const liquidoAntesAdvogado = Math.max(0, base.liquidoOriginal - desagioDireto);
    const honorariosAdvogado = liquidoAntesAdvogado * base.advogadoPct;
    const liquidoFinal = Math.max(0, liquidoAntesAdvogado - honorariosAdvogado);
    const parcelaLiquida = parcelas > 0 ? liquidoFinal / parcelas : 0;

    return {
      parcelas,
      rate,
      liquidoFinal,
      parcelaLiquida,
      honorariosAdvogado
    };
  }

  function futureOutcome(base, parcelas, annualRate = base.taxaAnual) {
    const scenario = simulate(base, parcelas);
    const monthly = monthlyRate(annualRate);
    let patrimonioFinal = 0;

    for (let month = 1; month <= parcelas; month += 1) {
      const monthsInvested = Math.max(0, HORIZON_MONTHS - month);
      patrimonioFinal += scenario.parcelaLiquida * Math.pow(1 + monthly, monthsInvested);
    }

    return {
      ...scenario,
      patrimonioFinal,
      rendimentoAcumulado: patrimonioFinal - scenario.liquidoFinal
    };
  }

  function breakEvenVsCash(base, parcelas) {
    if (parcelas === 1) return 0;

    const difference = (annualRate) => (
      futureOutcome(base, 1, annualRate).patrimonioFinal
      - futureOutcome(base, parcelas, annualRate).patrimonioFinal
    );

    if (difference(0) >= 0) return 0;

    let low = 0;
    let high = 5;

    if (difference(high) < 0) return null;

    for (let i = 0; i < 70; i += 1) {
      const mid = (low + high) / 2;
      if (difference(mid) >= 0) high = mid;
      else low = mid;
    }

    return high;
  }

  function keyScenarios(selected) {
    return [...new Set([1, 2, 12, 13, 14, 24, selected])].sort((a, b) => a - b);
  }

  function clearAnalysis() {
    el('investmentRateDisplay').textContent = '—';
    el('investmentBestScenario').textContent = '—';
    el('investmentBestValue').textContent = '—';
    el('investmentBestDelta').textContent = '—';
    el('investmentSelectedVerdict').textContent = 'Preencha os cinco valores do Blanco para gerar a análise.';
    el('investmentBreakEven').textContent = '—';
    el('investmentChart').innerHTML = '<p class="investment-empty">A comparação gráfica aparecerá aqui quando os dados estiverem completos.</p>';
    el('investmentBody').innerHTML = '<tr><td colspan="6" class="empty-row">Preencha os dados para comparar a vantajosidade financeira.</td></tr>';
    el('investmentTop3').textContent = '—';
  }

  function renderChart(outcomes, best) {
    const max = Math.max(...outcomes.map((x) => x.patrimonioFinal), 1);

    el('investmentChart').innerHTML = outcomes.map((outcome) => {
      const width = Math.max(2, (outcome.patrimonioFinal / max) * 100);
      const bestClass = outcome.parcelas === best.parcelas ? ' is-best' : '';
      return `<div class="investment-bar${bestClass}">
        <div class="investment-bar__meta">
          <strong>${scenarioLabel(outcome.parcelas)}</strong>
          <span>${money(outcome.patrimonioFinal)}</span>
        </div>
        <div class="investment-bar__track" aria-hidden="true">
          <span style="width:${width.toFixed(2)}%"></span>
        </div>
        <small>${outcome.parcelas === 1 ? '1 recebimento investido a partir do mês 1' : `${outcome.parcelas} recebimentos mensais reinvestidos até o mês 24`}</small>
      </div>`;
    }).join('');
  }

  function renderAnalysis() {
    if (!isComplete()) {
      clearAnalysis();
      return;
    }

    const base = readBase();
    const all = Array.from({ length: 24 }, (_, i) => futureOutcome(base, i + 1));
    const ranked = [...all].sort((a, b) => b.patrimonioFinal - a.patrimonioFinal);
    const best = ranked[0];
    const second = ranked[1];
    const selected = futureOutcome(base, base.parcelas);
    const selectedGap = best.patrimonioFinal - selected.patrimonioFinal;
    const comparisonRows = keyScenarios(base.parcelas).map((n) => futureOutcome(base, n));
    const chartRows = comparisonRows;

    el('investmentRateDisplay').textContent = `${percent(base.taxaAnual)} a.a.`;
    el('investmentBestScenario').textContent = scenarioLabel(best.parcelas);
    el('investmentBestValue').textContent = money(best.patrimonioFinal);
    el('investmentBestDelta').textContent = `${money(best.patrimonioFinal - second.patrimonioFinal)} acima da 2ª melhor (${scenarioLabel(second.parcelas)})`;

    if (selected.parcelas === best.parcelas) {
      el('investmentSelectedVerdict').textContent = `Com rentabilidade de ${percent(base.taxaAnual)} a.a., o cenário selecionado (${scenarioLabel(selected.parcelas)}) é o mais vantajoso entre 1 e 24 parcelas no horizonte de 24 meses.`;
    } else {
      el('investmentSelectedVerdict').textContent = `Com rentabilidade de ${percent(base.taxaAnual)} a.a., ${scenarioLabel(selected.parcelas)} acumula ${money(selected.patrimonioFinal)} em 24 meses, ficando ${money(selectedGap)} abaixo de ${scenarioLabel(best.parcelas)}.`;
    }

    const breakEven = breakEvenVsCash(base, base.parcelas);
    if (base.parcelas === 1) {
      el('investmentBreakEven').textContent = 'O próprio cenário selecionado é à vista.';
    } else if (breakEven === null) {
      el('investmentBreakEven').textContent = `Mesmo a 500% a.a., o à vista não alcança ${scenarioLabel(base.parcelas)} neste modelo.`;
    } else if (breakEven === 0) {
      el('investmentBreakEven').textContent = `À vista já é igual ou superior a ${scenarioLabel(base.parcelas)} mesmo sem rendimento.`;
    } else {
      el('investmentBreakEven').textContent = `Para o à vista empatar com ${scenarioLabel(base.parcelas)}, a renda fixa precisaria render aproximadamente ${percent(breakEven)} a.a. líquidos.`;
    }

    el('investmentTop3').textContent = ranked.slice(0, 3)
      .map((item, index) => `${index + 1}º ${scenarioLabel(item.parcelas)} · ${money(item.patrimonioFinal)}`)
      .join('  |  ');

    renderChart(chartRows, best);

    el('investmentBody').innerHTML = comparisonRows.map((outcome) => {
      const gap = best.patrimonioFinal - outcome.patrimonioFinal;
      const equilibrium = breakEvenVsCash(base, outcome.parcelas);
      let equilibriumText = '—';

      if (outcome.parcelas !== 1) {
        equilibriumText = equilibrium === null
          ? '> 500% a.a.'
          : percent(equilibrium);
      }

      return `<tr class="${outcome.parcelas === best.parcelas ? 'active' : ''}">
        <td>${scenarioLabel(outcome.parcelas)}</td>
        <td>${money(outcome.liquidoFinal)}</td>
        <td>${money(outcome.rendimentoAcumulado)}</td>
        <td>${money(outcome.patrimonioFinal)}</td>
        <td>${gap <= 0.01 ? 'Melhor opção' : `-${money(gap)}`}</td>
        <td>${equilibriumText}</td>
      </tr>`;
    }).join('');
  }

  WATCH_IDS.forEach((id) => {
    const node = el(id);
    if (!node) return;
    node.addEventListener('input', renderAnalysis);
    node.addEventListener('change', renderAnalysis);
    node.addEventListener('blur', renderAnalysis);
  });

  renderAnalysis();
})();
