# 🎯 TESTE AGORA - Bookmarklet Corrigido!

## ✅ O QUE FOI CORRIGIDO:

O problema era que o bookmarklet estava usando os **índices errados** das células da tabela.

**Antes:**
- `cells[1]` → pegava célula vazia
- `cells[2]` → pegava só o time visitante
- `cells[3]` → pegava célula vazia

**Agora (CORRETO):**
- `cells[2]` → Time 1 (mandante) ✅
- `cells[4]` → Time 2 (visitante) ✅
- `cells[6]` → Data ✅

---

## 🚀 COMO TESTAR:

### **1. Reinstalar o Bookmarklet**

1. **DELETE o botão antigo** dos seus favoritos (importante!)
2. Acesse: **https://loteca-pro-mateus-1767825041.web.app/bookmarklet.html**
3. Arraste o **novo botão** para seus favoritos

### **2. Testar na Programação**

1. Acesse: https://loterias.caixa.gov.br/Paginas/Programacao-Loteca.aspx
2. Clique no botão **"📋 Copiar Loteca"** nos favoritos
3. Você deve ver os dados aparecerem na tela por 3 segundos

### **3. Colar no Admin**

1. Acesse: https://loteca-pro-mateus-1767825041.web.app?page=admin
2. Cole (Ctrl+V) na caixa "Programação"
3. Clique em **PROCESSAR**

---

## 📊 EXEMPLO DO QUE DEVE SER COPIADO:

```json
{
  "tipo": "programacao",
  "concurso": "1229",
  "jogos": [
    {
      "jogo": 1,
      "time1": "CORINTHIANS/SP",
      "time2": "SAO PAULO/SP",
      "data": "Domingo"
    },
    {
      "jogo": 2,
      "time1": "CRUZEIRO/MG",
      "time2": "UBERLANDIA/MG",
      "data": "Sábado"
    },
    ...
  ]
}
```

---

## ✅ CHECKLIST DE VALIDAÇÃO:

Quando você colar os dados, verifique se:

- [ ] **Concurso** tem número (ex: "1229")
- [ ] **Time1** não está vazio
- [ ] **Time2** não está vazio
- [ ] **Data** não está vazia
- [ ] Tem **14 jogos** na lista

Se TODOS os itens estiverem OK, clique em **PROCESSAR**!

---

## ❌ SE DER ERRO:

**Erro: "Número do concurso não encontrado"**
→ Recarregue a página da Caixa e tente novamente

**Erro: "Dados incompletos! Os times não foram extraídos"**
→ Delete o bookmarklet antigo e reinstale o novo

**Erro: "Permission denied"**
→ Faça o deploy das regras do Firestore (ver INSTRUCOES_FINAIS.md)

---

## 🎉 RESULTADO ESPERADO:

Mensagem verde: **"✓ Programação do Concurso 1229 atualizado com sucesso!"**

---

**TESTE AGORA E ME AVISE SE FUNCIONOU!** 🚀
