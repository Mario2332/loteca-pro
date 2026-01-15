# Análise da Estrutura da Tabela da Caixa

## Dados Extraídos do Markdown:

**Concurso:** 1229 (17/01/2026, Sábado)

**Tabela:**
| Jogo | Coluna 1 | x | Coluna 2 | Data |
| --- | --- | --- | --- | --- |
| 1 | CORINTHIANS/SP | SAO PAULO/SP | Domingo |
| 2 | CRUZEIRO/MG | UBERLANDIA/MG | Sábado |

## Estrutura Correta:

- **Coluna 1** = Time Mandante (casa)
- **Coluna 2** = Time Visitante (fora)
- **Data** = Dia da semana

## Problema do Bookmarklet Atual:

O bookmarklet estava pegando:
- `time1` = vazio (não encontrou)
- `time2` = CORINTHIANS/SP (pegou a coluna errada)
- `data` = vazio (não encontrou)
- `concurso` = vazio (não encontrou)

## Solução:

Preciso inspecionar o HTML real da tabela para ver os seletores corretos.
