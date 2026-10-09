# Cálculos Eng — acordo fechado dos engenheiros APS

Calculadora estática do **acordo informado como fechado**, para estimar quanto será pago **à vista na conta bancária** e quanto será destinado **à conta vinculada do FGTS**. A interface possui **somente cinco entradas financeiras** da primeira página do cálculo Blanco; os percentuais e a forma de pagamento não podem ser alterados.

## Condições fixas

- Deságio de **20% sobre o crédito bruto global** do reclamante (verbas + FGTS).
- Honorários contratuais de **14% sobre o bruto remanescente**, incluídas as verbas e o FGTS.
- Honorários totais abatidos do **recebimento direto bancário**; a parcela correspondente ao FGTS também é paga pelo crédito direto, sem reduzir duas vezes o depósito de FGTS.
- Pagamento **único à vista**. Não há seleção de parcelamento, deságio sobre juros, outras taxas de deságio, investimento ou cenários alternativos.

O FGTS é indicado separadamente como depósito na **conta vinculada**, sem presumir saque imediato ou depósito em conta bancária.

## Origem dos cinco valores (página 1 da planilha Blanco)

1. Quadro "Resumo do Cálculo" → linha "Total" → coluna "Valor Corrigido".
2. Quadro "Resumo do Cálculo" → linha "Total" → coluna "Juros".
3. Quadro "Resumo do Cálculo" → linha "FGTS 8%" → coluna "Valor Corrigido".
4. Quadro "Resumo do Cálculo" → linha "FGTS 8%" → coluna "Juros".
5. Quadro "Descrição de Créditos e Descontos do Reclamante" → "Líquido Devido ao Reclamante".

**Não** usar o "Total Devido pelo Reclamado", que inclui também rubricas de outros credores/encargos patronais, nem incorporar honorários de sucumbência à base contratual.

## Cálculo

    Bruto original = Total corrigido + Total juros
    FGTS original = FGTS corrigido + FGTS juros

    Deságio global = 20% × Bruto original
    Bruto após deságio = Bruto original − Deságio global

    FGTS vinculado = FGTS original − (20% × FGTS original)
    Direto antes dos honorários = Líquido original − (20% × Líquido original)

    Base honorários = Bruto após deságio (verbas + FGTS)
    Honorários contratuais = 14% × Base honorários

    Na conta bancária = Direto antes dos honorários − Honorários contratuais
    Total econômico líquido = Na conta bancária + FGTS vinculado
    Percentual líquido = Total econômico líquido / Bruto original

O motor usa valores inteiros em centavos internamente, arredondados em cada etapa. Se o crédito bancário não cobrir os honorários, o aplicativo informa o saldo pendente e o desconta do total econômico, sem exibir depósito bancário negativo.

A retenção bruta **teórica**, sem as retenções já existentes na planilha, é de **68,80%** do bruto original (80% × 86%). O percentual econômico efetivo pode ser menor porque o "Líquido Devido ao Reclamante" já contém descontos, como IRPF.

**Limitação importante:** este cálculo proporcionaliza os descontos já refletidos no líquido original; **não recalcula IRPF/INSS nem substitui a liquidação jurídica ou contábil**. A natureza, a tributação e a forma de quitação de FGTS precisam ser confirmadas conforme o termo do acordo.

## Execução e testes

A aplicação funciona localmente abrindo o arquivo index.html, sem servidor nem armazenamento de dados. O repositório contém somente o motor fixo settlement-core.js, a interface app.js e o estilo principal styles.css.

Node.js 22+ para testar:

    node --check settlement-core.js
    node --check app.js
    node --test tests/*.test.cjs

Os testes usam apenas números fictícios e validam percentuais imutáveis, FGTS e honorários, depósito bancário, total recebido, validação e preenchimento dos cinco campos.
