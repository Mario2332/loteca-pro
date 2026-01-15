# 🎯 Fluxo Completo de Atualização - Loteca Pro

## 📋 PASSO A PASSO SEMANAL

### **1️⃣ COPIAR DADOS DA CAIXA**

#### **Programação (Próximo Concurso):**
1. Acesse: https://loterias.caixa.gov.br/Paginas/Programacao-Loteca.aspx
2. Clique no bookmarklet **"📋 Copiar Loteca"** nos favoritos
3. Aguarde mensagem verde: "✅ Dados copiados!"

#### **Resultados (Concurso Anterior):**
1. Acesse: https://loterias.caixa.gov.br/Paginas/Loteca.aspx
2. Clique no bookmarklet **"📋 Copiar Loteca"** nos favoritos
3. Aguarde mensagem verde: "✅ Dados copiados!"

---

### **2️⃣ ACESSAR PAINEL ADMIN**

1. Acesse: https://loteca-pro-mateus-1767825041.web.app?page=admin
2. Faça login com: **mateusmachado11m@gmail.com**

---

### **3️⃣ PROCESSAR DADOS**

#### **Para Programação:**
1. Cole os dados (Ctrl+V) na caixa **"Atualizar Programação"**
2. Clique em **"PROCESSAR PROGRAMAÇÃO"**
3. Aguarde mensagem: "✓ Dados salvos! Confira o preview abaixo"

#### **Para Resultados:**
1. Cole os dados (Ctrl+V) na caixa **"Atualizar Resultados"**
2. Clique em **"PROCESSAR RESULTADOS"**
3. Aguarde mensagem: "✓ Dados salvos! Confira o preview abaixo"

---

### **4️⃣ CONFERIR PREVIEW**

Uma tabela aparecerá mostrando:
- **Número do Concurso**
- **Tipo** (Programação ou Resultados)
- **Total de jogos** (deve ser 14)
- **Tabela completa** com todos os jogos

**Confira se os dados estão corretos:**
- ✅ Times mandantes e visitantes corretos
- ✅ Datas corretas
- ✅ Placares corretos (se for resultado)
- ✅ Total de 14 jogos

---

### **5️⃣ PUBLICAR NO SITE**

Se os dados estiverem corretos:
1. Clique no botão verde **"PUBLICAR NO SITE"**
2. Aguarde mensagem: "✓ Concurso XXXX publicado com sucesso!"
3. **PRONTO!** Os dados já estão visíveis para todos os usuários

Se encontrar algum erro:
1. Clique em **"CANCELAR"**
2. Volte ao site da Caixa e copie novamente

---

## 🔄 FLUXO TÉCNICO (O QUE ACONTECE NOS BASTIDORES)

```
1. Bookmarklet extrai dados da tabela HTML
   ↓
2. Dados convertidos para JSON
   ↓
3. JSON copiado para clipboard
   ↓
4. Você cola no Admin
   ↓
5. Admin valida estrutura
   ↓
6. Dados salvos em `concursos/{id}` (rascunho)
   ↓
7. Preview gerado e exibido
   ↓
8. Você confere e clica "PUBLICAR"
   ↓
9. Dados copiados para `concursos_publicados/{id}`
   ↓
10. `config/atual` atualizado com novo concurso ativo
   ↓
11. Frontend carrega automaticamente de `concursos_publicados`
   ↓
12. Site atualizado para todos os usuários! ✅
```

---

## 📊 ESTRUTURA DO FIRESTORE

### **Collections:**

1. **`concursos`** (Rascunhos)
   - Dados temporários que você está conferindo
   - Apenas você vê
   - Não aparecem no site

2. **`concursos_publicados`** (Públicos)
   - Dados que todos os usuários veem
   - Aparecem no site
   - Imutáveis após publicação

3. **`config`** (Configuração)
   - `atual/concursoProgramacao` → ID do concurso ativo
   - `atual/concursoResultado` → ID do último resultado
   - `atual/ultimaAtualizacao` → Timestamp

---

## ⚠️ IMPORTANTE

### **Antes de Publicar:**
- ✅ Confira TODOS os 14 jogos
- ✅ Verifique se os times estão corretos
- ✅ Verifique se as datas estão corretas
- ✅ Compare com o site da Caixa

### **Depois de Publicar:**
- ✅ Acesse o site principal: https://loteca-pro-mateus-1767825041.web.app
- ✅ Verifique se os dados aparecem corretamente
- ✅ Teste fazer um palpite

### **Se Publicar Dados Errados:**
- Você pode republicar corrigindo os dados
- Basta copiar novamente da Caixa e publicar
- O sistema sobrescreve os dados anteriores

---

## 🎯 QUANDO ATUALIZAR

### **Programação:**
- Toda semana quando a Caixa divulgar o novo concurso
- Geralmente às quintas-feiras

### **Resultados:**
- Logo após os jogos terminarem
- Geralmente aos domingos à noite ou segunda-feira

---

## ❓ SOLUÇÃO DE PROBLEMAS

### **Erro: "Número do concurso não encontrado"**
→ O bookmarklet não conseguiu extrair o número do concurso
→ Recarregue a página da Caixa e tente novamente

### **Erro: "Dados incompletos! Os times não foram extraídos"**
→ O bookmarklet não conseguiu extrair os times
→ Verifique se está na página correta da Caixa
→ Reinstale o bookmarklet

### **Erro: "Permission denied"**
→ As regras do Firestore não foram publicadas
→ Acesse o Firebase Console e publique as regras

### **Preview não aparece****
→ Verifique se clicou em "PROCESSAR"
→ Aguarde alguns segundos
→ Recarregue a página do Admin

### **Dados não aparecem no site após publicar**
→ Aguarde 10 segundos e recarregue o site
→ Limpe o cache do navegador (Ctrl+Shift+R)
→ Verifique no Firebase Console se os dados foram salvos

---

## 🔗 LINKS ÚTEIS

- **Site Principal:** https://loteca-pro-mateus-1767825041.web.app
- **Painel Admin:** https://loteca-pro-mateus-1767825041.web.app?page=admin
- **Bookmarklet:** https://loteca-pro-mateus-1767825041.web.app/bookmarklet.html
- **Firebase Console:** https://console.firebase.google.com/project/loteca-pro-mateus-1767825041
- **Firestore Data:** https://console.firebase.google.com/project/loteca-pro-mateus-1767825041/firestore/data
- **Firestore Rules:** https://console.firebase.google.com/project/loteca-pro-mateus-1767825041/firestore/rules
- **GitHub Repo:** https://github.com/mateusmachado11/loteca-pro

---

## 📝 CHECKLIST SEMANAL

```
[ ] Copiar Programação da Caixa
[ ] Processar no Admin
[ ] Conferir Preview
[ ] Publicar Programação
[ ] Verificar no Site
[ ] (Após jogos) Copiar Resultados da Caixa
[ ] Processar no Admin
[ ] Conferir Preview
[ ] Publicar Resultados
[ ] Verificar no Site
```

---

**🎉 SISTEMA COMPLETO E FUNCIONANDO!**

Qualquer dúvida, consulte este guia ou os outros arquivos de documentação.
