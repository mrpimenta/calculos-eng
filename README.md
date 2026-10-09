# Cálculos Eng — Simulador de Acordo APS

Aplicação web estática para comparar propostas de acordo dos engenheiros da Autoridade Portuária de Santos (APS), usando **cinco campos da primeira página do cálculo Blanco**. Os valores são processados apenas no navegador.

## Proposta principal: pagamento à vista

- **20% de deságio global** sobre o crédito bruto do reclamante, incluindo verbas + FGTS.
- **14% de honorários contratuais** sobre o crédito **bruto remanescente após o deságio**, incluindo verbas + FGTS.
- Os honorários contratuais são abatidos **integralmente do crédito bancário**; a parte calculada sobre FGTS também é descontada do dinheiro depositado diretamente.
- O **FGTS após o deságio** é mostrado separadamente, para a **conta vinculada do FGTS**. Não é presumido saque livre ou recebimento na conta corrente.
- O resumo exibe: **valor a cair na conta bancária**, **FGTS**, **total econômico líquido**, **percentual efetivamente recebido do bruto original**, **honorários** e **deságio da APS**.

Com 20% de deságio e 14% de honorários, a retenção **teórica bruta** é `80% × 86% = 68,8%` do valor original. O percentual líquido real da simulação pode ser menor, porque o campo "Líquido Devido ao Reclamante" já incorpora descontos do cálculo-fonte (como IRPF).

## Cinco valores copiados do Blanco

1. "Total" → "Valor Corrigido" (quadro Resumo do Cálculo).
2. "Total" → "Juros" (quadro Resumo do Cálculo).
3. "FGTS 8%" → "Valor Corrigido".
4. "FGTS 8%" → "Juros".
5. "Líquido Devido ao Reclamante" (quadro Descrição de Créditos e Descontos do Reclamante).

Não copiar o **Total Devido pelo Reclamado** nem os honorários de sucumbência para a base contratual: o total do reclamado também inclui encargos patronais e/ou rubricas de outros credores, fora do crédito bruto do reclamante.

## Memória de cálculo — cenário global

```text
Bruto original = Total Valor Corrigido + Total Juros
FGTS original = FGTS Valor Corrigido + FGTS Juros

Deságio da APS = 20% × Bruto original
Crédito bruto do acordo = Bruto original − Deságio da APS
FGTS após deságio = FGTS original × 80%
Líquido direto estimado antes do advogado = Líquido original × 80%

Base dos honorários = Crédito bruto do acordo (verbas brutas + FGTS)
Honorários = 14% × Base dos honorários
Honorários correspondentes ao FGTS = 14% × FGTS após deságio

Na conta bancária = Líquido direto após deságio − TODOS os honorários
FGTS vinculado = FGTS após deságio (não subtrair honorários novamente)
Total econômico líquido = Na conta bancária + FGTS vinculado
Percentual recebido = Total econômico líquido ÷ Bruto original
```

Para preservar consistência, o motor usa arredondamento em centavos a cada etapa. Se o crédito bancário for insuficiente para pagar os honorários, o simulador zera o depósito bancário, mostra o saldo pendente e o abate do total econômico.

**Atenção:** a proporcionalização do líquido do Blanco mantém os descontos já refletidos na planilha original. **Não é recálculo tributário**: IRPF, contribuição previdenciária, retenções, eventual quitação de FGTS ou ajustes próprios do termo do acordo precisam ser confirmados na liquidação. Os percentuais do deságio e do advogado podem ser alterados na interface, mas começam em **20%** e **14%**.

## Módulos preservados (não cumulativos)

O simulador também mantém o modelo alternativo de **deságio somente sobre juros**:

- 1 parcela: 70% sobre juros;
- 2 a 12 parcelas: 50% sobre juros;
- 13 a 24 parcelas: 30% sobre juros.

Esse modelo permanece independente do desconto global. Os honorários contratuais em **todos** os comparativos incidem sobre o crédito bruto após o deságio, incluindo FGTS, e são pagos com as verbas diretas. Também permanecem disponíveis a comparação entre 1 a 24 parcelas, valor presente, análise de aplicações em renda fixa e memória de cálculo.

O módulo global permite testar 15%, 20%, 30%, 50% ou uma taxa digitada entre 0% e 100%. O desconto global não é somado ao deságio sobre juros.

## Execução e verificação

Aplicação estática: abra `index.html` ou publique a raiz do repositório em hospedagem estática. Não há necessidade de servidor de API, login ou banco de dados.

Requer Node.js 22+ somente para executar os testes:

```bash
node --test tests/*.test.cjs
```

Os testes automáticos cobrem arredondamento monetário, honorários sobre FGTS, depósito bancário, percentuais, tratamento de saldo pendente, comparação não cumulativa e integração entre os módulos da interface.
