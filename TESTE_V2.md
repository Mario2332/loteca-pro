# 🎯 Teste da Versão 2.0 - Informações Adicionais

## ✨ O QUE FOI ADICIONADO

### **Bookmarklet v2.0:**
Agora captura automaticamente:

#### **Da Programação:**
- ✅ **Data do Concurso:** "17/01/2026, Sábado"
- ✅ **Período de Apostas:** "14/01/2026 até as 15h do dia 17/01/2026"
- ✅ **Realização dos Jogos:** "17/01/2026 a 18/01/2026"

#### **Dos Resultados:**
- ✅ **Estimativa de Prêmio:** "2.500.000,00"
- ✅ **Data Limite de Vendas:** "17/01/2026"

### **Frontend:**
As informações aparecem automaticamente na página principal:
- **Prêmio acumulado** no card de análise
- **Datas de abertura/fechamento** das apostas
- **Informações do concurso** no resumo

---

## 🧪 COMO TESTAR

### **1️⃣ REINSTALAR BOOKMARKLET (OBRIGATÓRIO)**

**Por que reinstalar?**
O bookmarklet antigo não captura as novas informações. Você PRECISA instalar a versão 2.0.

**Como fazer:**
1. Acesse: https://loteca-pro-mateus-1767825041.web.app/bookmarklet.html
2. **DELETE o botão antigo** dos favoritos
3. Arraste o **novo botão rosa** para os favoritos
4. Confirme que o nome é "📋 Copiar Loteca"

---

### **2️⃣ COPIAR PROGRAMAÇÃO**

1. Acesse: https://loterias.caixa.gov.br/Paginas/Programacao-Loteca.aspx
2. Clique no bookmarklet **"📋 Copiar Loteca"**
3. Aguarde mensagem verde
4. **IMPORTANTE:** Verifique se o JSON copiado tem estes campos:

```json
{
  "tipo": "programacao",
  "concurso": "1229",
  "dataConcurso": "17/01/2026, Sábado",  ← NOVO!
  "periodoApostas": "14/01/2026 até as 15h do dia 17/01/2026",  ← NOVO!
  "realizacaoJogos": "17/01/2026 a 18/01/2026",  ← NOVO!
  "jogos": [...]
}
```

Se NÃO tiver esses campos, você está usando o bookmarklet antigo!

---

### **3️⃣ PROCESSAR NO ADMIN**

1. Acesse: https://loteca-pro-mateus-1767825041.web.app?page=admin
2. Cole (Ctrl+V) na caixa "Programação"
3. Clique em **"PROCESSAR PROGRAMAÇÃO"**
4. **Confira o preview:**
   - Número do concurso
   - Data do concurso
   - Período de apostas
   - Realização dos jogos
   - 14 jogos completos

---

### **4️⃣ PUBLICAR**

1. Se tudo estiver correto, clique em **"PUBLICAR NO SITE"**
2. Aguarde mensagem de sucesso

---

### **5️⃣ VERIFICAR NO SITE**

1. Acesse: https://loteca-pro-mateus-1767825041.web.app
2. **Verifique se aparecem:**
   - ✅ Jogos reais (não os fake)
   - ✅ Número do concurso correto
   - ✅ Data do concurso no card de análise
   - ✅ Período de apostas nas informações
   - ✅ Prêmio acumulado (se copiou dos resultados)

---

## 📊 EXEMPLO COMPLETO

### **JSON da Programação (v2.0):**
```json
{
  "tipo": "programacao",
  "concurso": "1229",
  "dataConcurso": "17/01/2026, Sábado",
  "periodoApostas": "14/01/2026 até as 15h do dia 17/01/2026",
  "realizacaoJogos": "17/01/2026 a 18/01/2026",
  "jogos": [
    {
      "jogo": 1,
      "time1": "CORINTHIANS/SP",
      "time2": "SAO PAULO/SP",
      "data": "Domingo"
    },
    ...14 jogos
  ]
}
```

### **JSON dos Resultados (v2.0):**
```json
{
  "tipo": "resultado",
  "concurso": "1228",
  "estimativaPremio": "2.500.000,00",
  "dataLimiteVendas": "17/01/2026",
  "jogos": [
    {
      "jogo": 1,
      "time1": "CORINTHIANS/SP",
      "placar1": "2",
      "time2": "PONTE PRETA/SP",
      "placar2": "0",
      "data": "Domingo"
    },
    ...14 jogos
  ]
}
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após publicar, verifique:

### **No Firestore:**
1. Acesse: https://console.firebase.google.com/project/loteca-pro-mateus-1767825041/firestore/data
2. Navegue até: `concursos_publicados` → `1229` (ou o número do seu concurso)
3. Verifique se tem os campos:
   - `dataConcurso`
   - `periodoApostas`
   - `realizacaoJogos`

### **No Site:**
1. Acesse a página principal
2. Verifique se os dados aparecem:
   - Card de análise com data do concurso
   - Período de apostas
   - Prêmio acumulado

---

## ❌ PROBLEMAS COMUNS

### **"Campos novos não aparecem no JSON"**
→ Você está usando o bookmarklet antigo
→ Delete e reinstale o bookmarklet v2.0

### **"Dados aparecem no preview mas não no site"**
→ Limpe o cache do navegador (Ctrl+Shift+R)
→ Aguarde 10 segundos e recarregue

### **"Prêmio não aparece"**
→ O prêmio vem da página de RESULTADOS, não da programação
→ Copie também os resultados do concurso anterior

---

## 🎯 RESULTADO ESPERADO

Após completar todos os passos:

1. ✅ Site mostra jogos reais do concurso 1229
2. ✅ Card de análise mostra data do concurso
3. ✅ Informações de período de apostas aparecem
4. ✅ Prêmio acumulado atualizado (se copiou resultados)
5. ✅ Todos os 14 jogos com times corretos

---

**TESTE AGORA E ME AVISE O RESULTADO!** 🚀

Se encontrar algum problema, me envie:
1. Print do JSON copiado
2. Print do preview no Admin
3. Print da página principal do site
