# Simulador de Acordo APS — Engenheiros

Aplicação web estática para simular acordos em que a **Autoridade Portuária de Santos (APS) é a pagadora**, usando como referência os percentuais da Política de Assuntos Jurídicos para deságio sobre juros.

## Regras implementadas

- **1 parcela (à vista): 70%** de deságio sobre juros.
- **2 a 12 parcelas: 50%** de deságio sobre juros.
- **13 a 24 parcelas: 30%** de deságio sobre juros.
- O parcelamento mantém aviso sobre a condição de vencimento da primeira parcela prevista na norma.

## Entrada de dados

A interface foi deliberadamente reduzida a **cinco valores da primeira página do cálculo Blanco**, usando o texto do próprio documento para diminuir erro de preenchimento:

1. `“Total” → coluna “Valor Corrigido”` — quadro **Resumo do Cálculo**, última linha `Total`.
2. `“Total” → coluna “Juros”` — quadro **Resumo do Cálculo**, última linha `Total`.
3. `“FGTS 8%” → coluna “Valor Corrigido”` — quadro **Resumo do Cálculo**, linha `FGTS 8%`.
4. `“FGTS 8%” → coluna “Juros”` — quadro **Resumo do Cálculo**, linha `FGTS 8%`.
5. `“Líquido Devido ao Reclamante”` — quadro **Descrição de Créditos e Descontos do Reclamante**, última linha.

Não é necessário digitar bruto devido, depósito de FGTS, IRPF, contribuição social ou honorários.

## Lógica da simulação

```text
Juros diretos = Juros totais − Juros do FGTS
Deságio direto = Juros diretos × percentual da faixa
Deságio FGTS = Juros do FGTS × percentual da faixa
Deságio total = Deságio direto + Deságio FGTS

Bruto original do crédito = Valor Corrigido + Juros
Bruto após deságio = Bruto original − Deságio total

Recebimento direto estimado = Líquido original − Deságio direto
FGTS após deságio = FGTS corrigido + Juros do FGTS − Deságio FGTS
Total econômico = Recebimento direto estimado + FGTS após deságio
Parcela média = Recebimento direto estimado ÷ número de parcelas
```

O simulador preserva os demais descontos já refletidos no **Líquido Devido ao Reclamante** e não recalcula IRPF, contribuição previdenciária ou outros encargos.

## Interface

A UI segue uma direção de “planilha técnica transformada em instrumento digital”:

- rótulos idênticos aos do cálculo-fonte;
- indicação explícita de onde localizar cada número;
- painel de resultado sempre associado aos dados de entrada;
- comparação entre 1x, 12x, 13x, 14x e 24x;
- valor presente opcional por taxa anual de referência;
- memória de cálculo expansível;
- layout responsivo e navegação por teclado;
- dados processados somente no navegador.

## Executar

É uma aplicação estática. Basta abrir `index.html` ou publicar a raiz do repositório em uma hospedagem estática.

## Aviso

Ferramenta de simulação. O valor efetivamente acordado depende da redação do termo, homologação, atualização até a data do pagamento e tratamento tributário/previdenciário aplicável ao caso concreto.
