# 🎉 Loteca Pro - Sistema Simplificado Pronto!

## ✅ O QUE FOI FEITO:

1. **Bookmarklet Criado** - Botão mágico que extrai dados automaticamente
2. **Processamento Local** - Sem Cloud Functions (mais simples e barato)
3. **Firestore Integrado** - Dados salvos diretamente no banco
4. **Segurança Configurada** - Só você pode atualizar os dados
5. **Deploy Automático** - GitHub Actions fazendo deploy a cada push

---

## 🚀 COMO USAR (3 PASSOS):

### **1️⃣ INSTALAR O BOOKMARKLET (só 1 vez)**

1. Acesse: **https://loteca-pro-mateus-1767825041.web.app/bookmarklet.html**
2. Arraste o botão rosa **"📋 Copiar Loteca"** para seus favoritos
3. Pronto!

### **2️⃣ COPIAR DADOS DO SITE DA CAIXA**

**Para Programação:**
1. Vá para: https://loterias.caixa.gov.br/Paginas/Programacao-Loteca.aspx
2. Clique no botão **"📋 Copiar Loteca"** nos seus favoritos
3. Mensagem verde aparece: "✅ Dados copiados!"

**Para Resultados:**
1. Vá para: https://loterias.caixa.gov.br/Paginas/Loteca.aspx
2. Clique no botão **"📋 Copiar Loteca"** nos seus favoritos
3. Mensagem verde aparece: "✅ Dados copiados!"

### **3️⃣ COLAR NO PAINEL ADMIN**

1. Acesse: **https://loteca-pro-mateus-1767825041.web.app?page=admin**
2. Faça login com: **mateusmachado11m@gmail.com**
3. Cole os dados (Ctrl+V) na caixa correspondente
4. Clique em **"PROCESSAR"**
5. Pronto! ✅

---

## ⚠️ IMPORTANTE - FAZER UMA VEZ:

Você precisa fazer o deploy das regras de segurança do Firestore **uma única vez**.

### **Opção A - Via Console (Mais Fácil):**

1. Acesse: https://console.firebase.google.com/project/loteca-pro-mateus-1767825041/firestore/rules
2. Copie o conteúdo do arquivo `firestore.rules` (está no repositório)
3. Cole no editor
4. Clique em **"Publicar"**

### **Opção B - Via Terminal:**

```bash
cd loteca-pro
firebase login
firebase deploy --only firestore:rules
```

---

## 📁 ESTRUTURA DO PROJETO:

```
loteca-pro/
├── index.html                  # Aplicação principal (SPA)
├── public/
│   ├── index.html             # Cópia para deploy
│   └── bookmarklet.html       # Página do bookmarklet
├── firestore.rules            # Regras de segurança
├── firebase.json              # Config do Firebase
├── .github/workflows/         # Deploy automático
└── functions/                 # (NÃO USADO MAIS)
```

---

## 🔒 SEGURANÇA:

- ✅ Apenas você (mateusmachado11m@gmail.com) pode atualizar dados
- ✅ Todos podem ler os dados (público)
- ✅ Usuários autenticados podem salvar seus palpites
- ✅ Firestore Rules protegem o banco de dados

---

## 🎯 FLUXO COMPLETO:

```
Site da Caixa
    ↓
Bookmarklet (extrai dados)
    ↓
Clipboard (dados JSON)
    ↓
Painel Admin (você cola)
    ↓
Processamento Local (navegador)
    ↓
Firestore (salva no banco)
    ↓
Site Atualizado! ✅
```

---

## 🔗 LINKS IMPORTANTES:

- **Site:** https://loteca-pro-mateus-1767825041.web.app
- **Painel Admin:** https://loteca-pro-mateus-1767825041.web.app?page=admin
- **Bookmarklet:** https://loteca-pro-mateus-1767825041.web.app/bookmarklet.html
- **GitHub:** https://github.com/mateusmachado11/loteca-pro
- **Firebase Console:** https://console.firebase.google.com/project/loteca-pro-mateus-1767825041
- **Firestore Rules:** https://console.firebase.google.com/project/loteca-pro-mateus-1767825041/firestore/rules

---

## ❓ SOLUÇÃO DE PROBLEMAS:

### **Erro: "Failed to fetch"**
✅ **RESOLVIDO!** Agora processa localmente, sem Cloud Functions.

### **Erro: "Formato inválido"**
- Use o bookmarklet para copiar os dados
- Não cole HTML manualmente

### **Erro: "Permission denied"**
- Faça o deploy das regras do Firestore (ver seção acima)
- Certifique-se de estar logado com mateusmachado11m@gmail.com

### **Dados não aparecem no site**
- Aguarde alguns segundos (Firestore é em tempo real)
- Recarregue a página (F5)

---

## 💡 DICAS:

- **Tempo total:** Menos de 30 segundos para atualizar
- **Frequência:** Atualize sempre que houver novo concurso
- **Backup:** Os dados ficam salvos no Firestore
- **Histórico:** Cada concurso fica salvo com seu número

---

## 🎓 COMO FUNCIONA TECNICAMENTE:

1. **Bookmarklet:** JavaScript que roda no site da Caixa e extrai dados da tabela
2. **JSON:** Dados estruturados copiados para o clipboard
3. **Frontend:** Processa o JSON e valida a estrutura
4. **Firestore:** Salva os dados com timestamp e autor
5. **Regras:** Firebase Rules garantem que só admin pode escrever
6. **Deploy:** GitHub Actions faz deploy automático a cada commit

---

**🎉 TUDO PRONTO! Agora é só usar!**

Qualquer dúvida, consulte o arquivo `GUIA_SIMPLIFICADO.md` ou teste o fluxo completo.
