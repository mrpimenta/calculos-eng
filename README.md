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

## Comparação alternativa: desconto sobre juros, à vista

Além do acordo global (20% sobre o bruto), permanece disponível uma **comparação alternativa, também à vista**, em seção recolhida:

- Deságio de **70% somente sobre os juros**, inclusive a parcela de juros de FGTS.
- Honorários de **14% sobre o crédito bruto remanescente (verbas + FGTS)**, abatidos do pagamento direto.
- Resultado destacado por recebimento bancário, FGTS e total econômico.
- Memória de cálculo separada. **Os dois modelos de deságio não são cumulativos.**

Não existem seleção de prazos, cronograma de depósitos, projeção de parcelas, valor presente ou comparação de aplicação financeira. O simulador **sempre considera pagamento à vista**.

## Percentuais editáveis no acordo global

O acordo principal começa em **20% de deságio global** e **14% de honorários contratuais**, mas os campos são editáveis para testar cenários. O desconto global aceita 15%, 20%, 30%, 50% ou percentual digitado entre 0% e 100%. Todas as simulações do desconto global são à vista.

## Execução e verificação

Aplicação estática: abra `index.html` ou publique a raiz do repositório em hospedagem estática. Não há necessidade de servidor de API, login ou banco de dados.

Requer Node.js 22+ somente para executar os testes:

```bash
node --test tests/*.test.cjs
```

Os testes automáticos cobrem arredondamento monetário, honorários sobre FGTS, depósito bancário, percentuais, tratamento de saldo pendente, comparação não cumulativa e integração entre os módulos da interface.
