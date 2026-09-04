# Simulador de Acordo APS — Engenheiros

Aplicação web estática para simular acordos em que a **Autoridade Portuária de Santos (APS) é a pagadora**, usando como referência os percentuais da Política de Assuntos Jurídicos (POL.SUJUD.GCO.017) para deságio sobre juros e multas.

## Regras implementadas

Para pagamentos pela APS, o simulador usa o **deságio normativo mínimo**:

- **1 parcela (à vista): 70%** de deságio sobre juros e multas — item 28, I.
- **2 a 12 parcelas: 50%** de deságio sobre juros e multas — item 28, III.
- **13 a 24 parcelas: 30%** de deságio sobre juros e multas — item 28, V.
- Em parcelamentos, a primeira parcela deve vencer em no máximo 30 dias da assinatura/homologação — item 28.1.
- Cada parte arca com os honorários de seus patronos, conforme os itens citados.

Fonte institucional: Política de Assuntos Jurídicos da APS, disponível em:
https://www.portodesantos.com.br/autoridade-portuaria-de-santos/governanca-corporativa/politicas-e-codigos/

## Como o cálculo funciona

O usuário informa os totais necessários do resumo da primeira página do cálculo judicial:

- Total da coluna **Valor Corrigido**;
- Total da coluna **Juros**;
- Multas, se houver;
- FGTS — valor corrigido e juros, para separar o que vai para a conta vinculada;
- IRPF e outros descontos do reclamante;
- Honorários dos patronos, opcionalmente, apenas para informação.

Fórmulas principais:

```text
Deságio = (Juros + Multas) × percentual da faixa
Juros/Multas após deságio = (Juros + Multas) − Deságio
Crédito bruto após acordo = Valor Corrigido + Juros/Multas após deságio
FGTS após acordo = FGTS corrigido + FGTS juros × (1 − percentual de deságio)
Líquido direto estimado = Crédito bruto após acordo − FGTS após acordo − IRPF − outros descontos
Parcela média direta = Líquido direto estimado ÷ número de parcelas
```

O IRPF informado é preservado como uma aproximação. O simulador **não recalcula tributação**, encargos ou eventuais critérios específicos do termo de acordo/homologação.

## Recursos

- Regra de deságio automática por quantidade de parcelas;
- Comparação entre 1x, 12x, 13x, 14x e 24x;
- Valor total, valor líquido direto e FGTS separado;
- Parcela média mensal;
- Comparação opcional por valor presente usando uma taxa anual informada pelo usuário;
- Memória de cálculo detalhada;
- Dados processados apenas no navegador;
- Impressão do resumo.

## Executar

É uma aplicação estática. Basta abrir `index.html` ou publicar a raiz do repositório em qualquer hospedagem estática, como Netlify, GitHub Pages ou Vercel.

## Aviso

Ferramenta de simulação. O valor efetivamente acordado depende da redação do termo, homologação, atualização até a data do pagamento e tratamento tributário/previdenciário aplicável ao caso concreto.
