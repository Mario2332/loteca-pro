# 📚 DOCUMENTAÇÃO COMPLETA - LOTECA PRO

**Data:** 15/01/2026  
**Versão:** 2.0

---

## 🎯 VISÃO GERAL

Sistema web para análise e palpites da Loteca, com dados reais da Caixa e análises geradas por IA (Gemini 2.0 Flash).

---

## 📄 PÁGINAS DO SITE

### 1. **PÁGINA INICIAL** (`/?page=home` ou `/`)

#### **Seção: Concurso Atual (Próximo)**
- **Número do concurso** (ex: #1229)
- **Status:** "Aberto" ou "Encerrado"
- **Prêmio acumulado** (ex: R$ 2.500.000,00)
- **Resumo da IA** (até 3 linhas) - análise dos jogos da programação
- **Datas:**
  - Abertura (ex: "Quinta, 16/01 às 10h")
  - Encerramento (ex: "Sábado, 18/01 às 14h")
- **Botão:** "VER ANÁLISE E PALPITES" → Abre modal com análise completa

#### **Seção: Concurso Anterior (Último Resultado)**
- **Número do concurso** (ex: #1228)
- **Status:** "Acumulou!" ou "X Ganhadores"
- **Ganhadores 14 acertos:** Número ou "Não houve"
- **Ganhadores 13 acertos:** Número + valor por aposta
- **Resumo da IA** (até 3 linhas) - resumo dos resultados
- **Botão:** "VER ANÁLISE DETALHADA" → **RECARREGA** para página de análise

#### **Seção: Notícias**
- Cards com notícias dos times
- Badge "QUENTE" para notícias recentes
- Fonte da notícia

#### **Seção: Ranking**
- Top apostadores
- Pontuação
- Acertos

---

### 2. **PÁGINA DE ANÁLISE DETALHADA** (`/?page=analise&concurso=1228`)

**Objetivo:** Análise completa do concurso anterior (resultados)

#### **Estrutura:**

1. **Cabeçalho:**
   - Título: "Análise Completa - Concurso #1228"
   - Status: "Acumulou!" ou "X Ganhadores"
   - Ganhadores 14 acertos
   - Ganhadores 13 acertos + valor

2. **Análise Geral (IA):**
   - Texto longo (3-5 parágrafos)
   - Análise do concurso como um todo
   - Estatísticas gerais
   - Zebras e surpresas
   - Tendências

3. **Análise de Cada Jogo (14 jogos):**
   - Para cada um dos 14 jogos:
     - **Jogo X:** Time1 X x Y Time2
     - **Análise da IA:** 2-3 parágrafos sobre o jogo específico
     - Como foi a partida
     - Destaques
     - Contexto do resultado

4. **Botão:** "VOLTAR PARA INÍCIO"

---

### 3. **PÁGINA DE PALPITES** (`/?page=palpites`)

- Formulário para fazer palpites
- Lista dos 14 jogos
- Opções: Coluna 1, Empate (x), Coluna 2
- Botão: "SALVAR PALPITES"

---

### 4. **PÁGINA DE RANKING** (`/?page=ranking`)

- Tabela com ranking completo
- Colunas:
  - Posição
  - Nome
  - Pontos
  - Acertos 14
  - Acertos 13

---

### 5. **PÁGINA ADMIN** (`/?page=admin`)

**Acesso:** Apenas mateusmachado11m@gmail.com

#### **Funcionalidades:**

1. **Colar Programação:**
   - Textarea para colar JSON do bookmarklet
   - Botão: "PROCESSAR PROGRAMAÇÃO"

2. **Colar Resultados:**
   - Textarea para colar JSON do bookmarklet
   - Botão: "PROCESSAR RESULTADOS"

3. **Preview:**
   - Mostra dados processados
   - Tabela formatada
   - Botão: "PUBLICAR NO SITE" (verde)
   - Botão: "CANCELAR" (vermelho)

4. **Processo de Publicação:**
   - Clica em "PUBLICAR"
   - Mensagem: "⏳ Gerando análise com IA..."
   - Aguarda 3-5 segundos
   - IA gera análise
   - Salva no Firestore
   - Mensagem: "✓ Concurso X publicado com sucesso!"

---

## 🔖 BOOKMARKLET

### **Versão 2.0 - Funcionalidades:**

#### **Para PROGRAMAÇÃO:**
Captura:
- Número do concurso
- Data do concurso
- Período de apostas
- Realização dos jogos
- 14 jogos com:
  - Time mandante (coluna 1)
  - Time visitante (coluna 2)
  - Data do jogo

#### **Para RESULTADOS:**
Captura:
- Número do concurso
- Estimativa de prêmio do próximo concurso
- Ganhadores 14 acertos (número ou "Não houve")
- Ganhadores 13 acertos (número + valor)
- 14 jogos com:
  - Time mandante (coluna 1)
  - Placar mandante
  - Time visitante (coluna 2)
  - Placar visitante
  - Data do jogo

---

## 🤖 ANÁLISE COM IA (GEMINI 2.0 FLASH)

### **Configuração:**
- **Modelo:** gemini-2.0-flash
- **API:** Google Generative Language API
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- **Chave:** AIzaSyBKa8GWLeBszz0GKAQFxkIIVEbGoJyqG9g

### **Prompts:**

#### **Para PROGRAMAÇÃO:**
```
Você é um analista especializado em futebol e Loteca.

Analise a programação do concurso X da Loteca com os seguintes jogos:

[Lista dos 14 jogos com Time1 (mandante) x Time2 (visitante)]

Gere uma análise em DUAS PARTES:

1. RESUMO (máximo 120 caracteres):
Frase curta destacando os principais clássicos ou jogos importantes.

2. ANÁLISE DETALHADA (2-3 parágrafos):
- Destaque os principais clássicos e derbies
- Analise os confrontos mais importantes
- Mencione times favoritos e possíveis zebras
- Contexto dos campeonatos

IMPORTANTE: 
- Time1 é o MANDANTE (joga em casa)
- Time2 é o VISITANTE (joga fora)
- Use formato: "Time1 x Time2"
```

#### **Para RESULTADOS:**
```
Você é um analista especializado em futebol e Loteca.

Analise os resultados do concurso X da Loteca:

[Lista dos 14 jogos com placares]

Gere uma análise em DUAS PARTES:

1. RESUMO (máximo 120 caracteres):
Frase curta com estatísticas principais (vitórias mandante, empates, zebras).

2. ANÁLISE DETALHADA (3-5 parágrafos):
- Estatísticas gerais (vitórias mandante/visitante, empates)
- Zebras e surpresas
- Goleadas e placares altos
- Análise do concurso como um todo

IMPORTANTE:
- Time1 é o MANDANTE (jogou em casa)
- Time2 é o VISITANTE (jogou fora)
- Placar1 é do mandante, Placar2 é do visitante
- Use formato: "Time1 Placar1 x Placar2 Time2"
```

#### **Para ANÁLISE DE CADA JOGO:**
```
Analise especificamente o jogo:
Jogo X: Time1 Placar1 x Placar2 Time2

Gere uma análise de 2-3 parágrafos sobre:
- Como foi a partida
- Destaques e momentos importantes
- Contexto do resultado
- Impacto no campeonato

IMPORTANTE:
- Time1 é o MANDANTE
- Time2 é o VISITANTE
```

---

## 🗄️ ESTRUTURA DO FIRESTORE

### **Collection: `concursos_publicados`**

#### **Document ID:** Número do concurso (ex: "1229")

#### **Campos:**

```javascript
{
  // Dados básicos
  concurso: "1229",
  tipo: "programacao" | "resultados",
  status: "publicado",
  publicado: Timestamp,
  publicadoPor: "mateusmachado11m@gmail.com",
  
  // Dados da programação
  dataConcurso: "17/01/2026, Sábado",
  periodoApostas: "14/01/2026 até as 15h do dia 17/01/2026",
  realizacaoJogos: "17/01/2026 a 18/01/2026",
  
  // Dados dos resultados
  estimativaPremio: "2.500.000,00",
  ganhadores14: 0 | number,
  ganhadores13: {
    quantidade: 4,
    valorPorAposta: "47.865,22"
  },
  acumulou: true | false,
  
  // Jogos
  jogos: [
    {
      jogo: 1,
      time1: "CORINTHIANS/SP", // mandante
      time2: "SAO PAULO/SP",   // visitante
      placar1: 3,  // (só em resultados)
      placar2: 0,  // (só em resultados)
      data: "Domingo"
    },
    // ... mais 13 jogos
  ],
  
  // Análise da IA
  analise: {
    resumo: "Texto curto (120 chars)",
    detalhada: "Texto longo (3-5 parágrafos)",
    geradaEm: "2026-01-15T19:30:00.000Z"
  },
  
  // Análise de cada jogo (só em resultados)
  analiseJogos: [
    {
      jogo: 1,
      analise: "Texto de 2-3 parágrafos sobre o jogo 1"
    },
    // ... mais 13 análises
  ]
}
```

---

## 🔄 FLUXO COMPLETO

### **1. Atualizar Programação:**

```
1. Usuário acessa: https://loterias.caixa.gov.br/Paginas/Programacao-Loteca.aspx
2. Clica no bookmarklet "📋 Copiar Loteca"
3. Dados copiados automaticamente
4. Acessa Admin: https://loteca-pro-mateus-1767825041.web.app?page=admin
5. Cola (Ctrl+V) na caixa "Programação"
6. Clica em "PROCESSAR PROGRAMAÇÃO"
7. Confere preview
8. Clica em "PUBLICAR NO SITE"
9. Aguarda "⏳ Gerando análise com IA..." (3-5s)
10. Vê "✓ Concurso 1229 publicado com sucesso!"
11. Acessa site e vê dados atualizados
```

### **2. Atualizar Resultados:**

```
1. Usuário acessa: https://loterias.caixa.gov.br/Paginas/Loteca.aspx
2. Clica no bookmarklet "📋 Copiar Loteca"
3. Dados copiados automaticamente
4. Acessa Admin
5. Cola na caixa "Resultados"
6. Clica em "PROCESSAR RESULTADOS"
7. Confere preview
8. Clica em "PUBLICAR NO SITE"
9. Aguarda IA gerar:
   - Análise geral
   - Análise de cada um dos 14 jogos
10. Vê "✓ Concurso 1228 publicado com sucesso!"
11. Acessa site e vê:
    - Concurso anterior atualizado
    - Botão "VER ANÁLISE DETALHADA" funciona
    - Página de análise completa com 14 análises individuais
```

---

## 🎨 DESIGN

### **Cores:**
- **Primary:** #667eea (roxo)
- **Secondary:** #764ba2 (roxo escuro)
- **Background:** #0f172a (azul escuro)
- **Surface:** #1e293b (azul médio)
- **AI:** #8b5cf6 (roxo IA)

### **Tipografia:**
- **Fonte:** Inter (sans-serif)
- **Títulos:** font-black (900)
- **Corpo:** font-normal (400)

---

## 🔐 SEGURANÇA

### **Firestore Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.email == 'mateusmachado11m@gmail.com';
    }
    
    // Concursos publicados - todos leem, só admin escreve
    match /concursos_publicados/{concursoId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Config - todos leem, só admin escreve
    match /config/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }
  }
}
```

---

## 📊 MÉTRICAS

- **Tempo de carregamento:** < 2s
- **Tempo de análise IA:** 3-5s
- **Custo IA por análise:** ~$0.001 (praticamente zero)
- **Limite gratuito:** 1500 requisições/dia

---

## 🐛 PROBLEMAS CONHECIDOS E SOLUÇÕES

### **1. Times invertidos na análise:**
- **Causa:** IA não sabia qual era mandante/visitante
- **Solução:** Prompt atualizado com "Time1 é MANDANTE, Time2 é VISITANTE"

### **2. Chave da API vazada:**
- **Causa:** Chave exposta no GitHub
- **Solução:** Nova chave criada (AIzaSyBKa8GWLeBszz0GKAQFxkIIVEbGoJyqG9g)

### **3. Erro 403/404 na API:**
- **Causa:** API não habilitada ou modelo errado
- **Solução:** Habilitar API + usar gemini-2.0-flash

---

## 📝 PRÓXIMAS MELHORIAS

- [ ] Análise de cada jogo individual
- [ ] Página de análise detalhada separada
- [ ] Sistema de palpites funcional
- [ ] Ranking real com usuários
- [ ] Notificações por email
- [ ] PWA (Progressive Web App)

---

**Última atualização:** 15/01/2026 às 19:30
