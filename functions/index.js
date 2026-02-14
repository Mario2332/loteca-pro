const {onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const axios = require('axios');

// Definir secrets
const geminiApiKey = defineSecret('GEMINI_API_KEY');

admin.initializeApp();
const db = admin.firestore();

// E-mail do administrador para receber alertas
const ADMIN_EMAIL = 'mateusmachado11m@gmail.com';

// API-Football config (plano Free - usado para H2H)
const API_FOOTBALL_KEY = 'f25bf6f2f1e7136176772374585a3b23';
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

/**
 * Cloud Function que monitora mudanças no site da Loteca
 * Executa automaticamente a cada 1 hora
 */
exports.monitorarLoteca = onSchedule('every 1 hours', async (event) => {
    try {
        console.log('Iniciando monitoramento da Loteca...');
        
        const url = 'https://loterias.caixa.gov.br/Paginas/Loteca.aspx';
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        
        const contentHash = Buffer.from(response.data).toString('base64').substring(0, 50);
        
        const monitorDoc = await db.collection('sistema').doc('monitor').get();
        const lastHash = monitorDoc.exists ? monitorDoc.data().lastHash : null;
        
        if (lastHash && lastHash !== contentHash) {
            await enviarAlerta('NOVA ATUALIZAÇÃO DETECTADA NA LOTECA!', 
                `O site da Caixa foi atualizado. Acesse o painel admin para atualizar os dados:\n\n` +
                `https://loteca-pro-mateus-1767825041.web.app?page=admin`
            );
        }
        
        await db.collection('sistema').doc('monitor').set({
            lastHash: contentHash,
            lastCheck: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('Monitoramento concluído!');
        return null;
    } catch (error) {
        console.error('Erro ao monitorar:', error);
        return null;
    }
});

/**
 * Endpoint para processar HTML colado pelo admin
 */
exports.processarDadosAdmin = onRequest({cors: true}, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }
        
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        if (decodedToken.email !== ADMIN_EMAIL) {
            return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        
        const { htmlContent, tipo } = req.body;
        
        if (!htmlContent || !tipo) {
            return res.status(400).json({ success: false, error: 'Dados incompletos' });
        }
        
        const cheerio = require('cheerio');
        const $ = cheerio.load(htmlContent);
        
        let dados = {};
        
        if (tipo === 'programacao') {
            const jogos = [];
            $('table tbody tr').each((i, elem) => {
                if (i >= 14) return;
                const cols = $(elem).find('td');
                if (cols.length >= 3) {
                    jogos.push({
                        id: i + 1,
                        timeCasa: $(cols[0]).text().trim(),
                        timeFora: $(cols[1]).text().trim(),
                        data: $(cols[2]).text().trim()
                    });
                }
            });
            
            const numeroConcurso = $('h2, h3').text().match(/\d+/)?.[0] || '0';
            
            dados = {
                tipo: 'programacao',
                numero: numeroConcurso,
                jogos,
                dataAtualizacao: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('loteca').doc('programacao_atual').set(dados);
            
        } else if (tipo === 'resultados') {
            const jogos = [];
            $('table tbody tr').each((i, elem) => {
                if (i >= 14) return;
                const cols = $(elem).find('td');
                if (cols.length >= 4) {
                    jogos.push({
                        id: i + 1,
                        timeCasa: $(cols[0]).text().trim(),
                        placar: $(cols[1]).text().trim(),
                        timeFora: $(cols[2]).text().trim(),
                        resultado: $(cols[3]).text().trim()
                    });
                }
            });
            
            const numeroConcurso = $('h2, h3').text().match(/\d+/)?.[0] || '0';
            
            dados = {
                tipo: 'resultados',
                numero: numeroConcurso,
                jogos,
                dataAtualizacao: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('loteca').doc('resultados_ultimo').set(dados);
        }
        
        res.json({ 
            success: true, 
            message: 'Dados processados com sucesso!',
            dados 
        });
        
    } catch (error) {
        console.error('Erro ao processar:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Função auxiliar para enviar alertas
 */
async function enviarAlerta(assunto, mensagem) {
    try {
        await db.collection('alertas').add({
            para: ADMIN_EMAIL,
            assunto,
            mensagem,
            lido: false,
            dataEnvio: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Alerta salvo: ${assunto}`);
    } catch (error) {
        console.error('Erro ao enviar alerta:', error);
    }
}

/**
 * Endpoint para buscar alertas não lidos
 */
exports.buscarAlertas = onRequest({cors: true}, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }
        
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        if (decodedToken.email !== ADMIN_EMAIL) {
            return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        
        const alertas = await db.collection('alertas')
            .where('lido', '==', false)
            .orderBy('dataEnvio', 'desc')
            .limit(10)
            .get();
        
        const lista = alertas.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        res.json({ success: true, alertas: lista });
        
    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// ANÁLISE COM IA - VERSÃO 4 (NUNCA FALHA - 3 níveis de fallback)
// ============================================================

/**
 * Busca H2H (confronto direto) entre dois times via API-Football
 */
async function buscarH2H(timeCasa, timeFora) {
  try {
    const [resCasa, resFora] = await Promise.all([
      axios.get(`${API_FOOTBALL_URL}/teams`, {
        headers: { 'x-apisports-key': API_FOOTBALL_KEY },
        params: { search: timeCasa },
        timeout: 5000
      }),
      axios.get(`${API_FOOTBALL_URL}/teams`, {
        headers: { 'x-apisports-key': API_FOOTBALL_KEY },
        params: { search: timeFora },
        timeout: 5000
      })
    ]);

    const idCasa = resCasa.data?.response?.[0]?.team?.id;
    const idFora = resFora.data?.response?.[0]?.team?.id;

    if (!idCasa || !idFora) return null;

    const resH2H = await axios.get(`${API_FOOTBALL_URL}/fixtures/headtohead`, {
      headers: { 'x-apisports-key': API_FOOTBALL_KEY },
      params: { h2h: `${idCasa}-${idFora}`, last: 5 },
      timeout: 5000
    });

    const jogos = resH2H.data?.response || [];
    if (jogos.length === 0) return null;

    const resultados = jogos.map(f => {
      const h = f.teams.home.name;
      const a = f.teams.away.name;
      const gh = f.goals.home;
      const ga = f.goals.away;
      return `${h} ${gh}x${ga} ${a}`;
    });

    return {
      confrontos: resultados,
      texto: `Ultimos ${resultados.length} confrontos: ${resultados.join(' | ')}`
    };
  } catch (err) {
    console.log(`H2H erro: ${err.message}`);
    return null;
  }
}

/**
 * Chama a API do Gemini com retry robusto
 * Tenta múltiplos modelos se necessário (gemini-2.0-flash -> gemini-1.5-flash)
 */
async function chamarGemini(apiKey, prompt, useGrounding, maxRetries = 5, deadlineMs = null) {
  // Controle de tempo global - se tiver deadline, respeitar
  const startTime = Date.now();
  const hasDeadline = deadlineMs && deadlineMs > 0;

  // Modelo principal (gemini-2.0-flash é o mais confiável)
  const modelo = { nome: 'gemini-2.0-flash', version: 'v1beta' };
  const apiUrl = `https://generativelanguage.googleapis.com/${modelo.version}/models/${modelo.nome}:generateContent?key=${apiKey}`;
  
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 16384
    }
  };
  
  if (useGrounding) {
    requestBody.tools = [{ google_search: {} }];
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Verificar se ainda temos tempo
    if (hasDeadline) {
      const elapsed = Date.now() - startTime;
      const remaining = deadlineMs - elapsed;
      if (remaining < 15000) { // Menos de 15s restantes
        console.log(`  Tempo insuficiente (${Math.round(remaining/1000)}s restantes), abortando...`);
        return null;
      }
    }

    try {
      console.log(`  ${modelo.nome} (grounding=${useGrounding}) tentativa ${attempt}/${maxRetries}...`);
      const response = await axios.post(apiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 120000
      });
      
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`  ${modelo.nome} respondeu com sucesso na tentativa ${attempt}`);
        return response;
      }
      console.log(`  Resposta sem texto valido`);
    } catch (apiError) {
      const status = apiError.response?.status;
      const errorBody = apiError.response?.data?.error?.message || apiError.message;
      console.log(`  Tentativa ${attempt} falhou: status=${status} msg=${errorBody}`);
      
      if (status === 429) {
        // Rate limit - espera progressiva mais agressiva: 30s, 60s, 90s, 120s, 150s
        const waitTime = attempt * 30000;
        console.log(`  Rate limit (429) - aguardando ${waitTime/1000}s antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      if (status === 503 || status === 500) {
        // Servidor sobrecarregado - espera moderada
        const waitTime = attempt * 15000;
        console.log(`  Servidor indisponivel (${status}) - aguardando ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      if (status === 400 && useGrounding) {
        // Grounding pode não ser suportado - sair para tentar sem grounding
        console.log(`  Grounding nao suportado (400), saindo para tentar sem grounding...`);
        return null;
      }
      if (attempt < maxRetries) {
        const waitTime = 5000 + (attempt * 5000);
        console.log(`  Aguardando ${waitTime/1000}s antes da proxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  console.log(`  Modelo ${modelo.nome} esgotou ${maxRetries} tentativas`);
  return null;
}

/**
 * Gera análise de fallback local (sem IA) para quando TUDO falha
 * Garante que o concurso NUNCA fica sem análise
 */
function gerarAnaliseFallback(tipo, concurso, jogos) {
  console.log('>>> GERANDO ANALISE FALLBACK LOCAL (sem IA) <<<');
  
  if (tipo === 'programacao') {
    const analiseJogos = jogos.map((j, idx) => {
      const time1 = j.time1 || j.timeCasa || 'Time Casa';
      const time2 = j.time2 || j.timeFora || 'Time Fora';
      return {
        jogo: idx + 1,
        timeCasa: time1,
        timeFora: time2,
        historicoCasa: '',
        historicoFora: '',
        consensoMercado: 'Dados de mercado indisponiveis no momento. Consulte sites de apostas para odds atualizadas.',
        contextoLocal: 'Informacoes de bastidores indisponiveis no momento. Consulte portais esportivos locais.',
        analiseTecnica: `Confronto entre ${time1} (mandante) e ${time2} (visitante). Analise detalhada sera atualizada em breve.`,
        h2h: '',
        palpite: '1',
        confianca: 50,
        riscoZebra: 'Medio',
        analise: `Jogo entre ${time1} e ${time2}. O mando de campo pode ser um fator importante. Analise completa com dados de mercado e noticias sera gerada assim que o servico de IA estiver disponivel. Use o botao "Regenerar Analise IA" no painel admin para atualizar.`,
        fontesUsadas: 'Analise pendente - use Regenerar Analise IA'
      };
    });

    const palpites = jogos.map(() => '1').join(',');

    return {
      resumo: `Concurso ${concurso} da Loteca - Analise preliminar com ${jogos.length} jogos. Use "Regenerar Analise IA" no admin para obter a analise completa com odds e noticias.`,
      detalhada: `A analise completa com inteligencia artificial para o Concurso ${concurso} nao pode ser gerada neste momento devido a indisponibilidade temporaria do servico de IA. Os dados basicos dos ${jogos.length} jogos estao disponiveis abaixo.\n\nPara obter a analise completa com odds reais de casas de apostas, noticias de jornais locais e palpites fundamentados, acesse o painel admin e clique em "Regenerar Analise IA".\n\nEsta e uma analise preliminar que sera substituida pela analise completa assim que o servico estiver disponivel.`,
      analiseJogos: analiseJogos,
      resumoCartela: {
        palpites: palpites,
        duplos: [],
        triplos: [],
        estrategia: 'Estrategia sera gerada com a analise completa. Use "Regenerar Analise IA" no admin.',
        jogosChave: []
      },
      _fallback: true
    };
  } else {
    // Resultados
    let vMandante = 0, empates = 0, vVisitante = 0;
    const analiseJogos = jogos.map((j, idx) => {
      const time1 = j.time1 || j.timeCasa || 'Time Casa';
      const time2 = j.time2 || j.timeFora || 'Time Fora';
      const p1 = parseInt(j.placar1) || 0;
      const p2 = parseInt(j.placar2) || 0;
      let resultado = 'X';
      if (p1 > p2) { resultado = '1'; vMandante++; }
      else if (p1 < p2) { resultado = '2'; vVisitante++; }
      else { empates++; }
      
      return {
        jogo: idx + 1,
        timeCasa: time1,
        timeFora: time2,
        placar: `${p1}x${p2}`,
        resultado: resultado,
        foiZebra: false,
        destaques: `${time1} ${p1}x${p2} ${time2}.`,
        analise: `${time1} ${p1}x${p2} ${time2}. Analise detalhada sera atualizada em breve.`,
        fontesUsadas: 'Analise pendente'
      };
    });

    return {
      resumo: `Resultados do Concurso ${concurso}: ${vMandante} vitorias do mandante, ${empates} empates e ${vVisitante} vitorias do visitante.`,
      detalhada: `Os resultados do Concurso ${concurso} foram registrados. Analise completa com cronicas dos jogos sera gerada em breve.\n\nUse "Regenerar Analise IA" no admin para obter a analise completa.`,
      analiseJogos: analiseJogos,
      estatisticas: {
        mandantes: vMandante,
        empates: empates,
        visitantes: vVisitante,
        zebras: 0,
        goleadas: 0,
        jogoDestaque: 1,
        resumoEstatistico: `Rodada com ${vMandante} vitorias do mandante, ${empates} empates e ${vVisitante} vitorias do visitante.`
      },
      _fallback: true
    };
  }
}

/**
 * Cloud Function para gerar análise avançada com IA (Gemini)
 * 
 * VERSÃO 4 - NUNCA RETORNA ERRO 500
 * 
 * Sistema de 3 níveis de fallback:
 * 1. Gemini com Google Search Grounding (melhor qualidade)
 * 2. Gemini sem Grounding (boa qualidade)
 * 3. Análise local sem IA (qualidade básica, mas NUNCA falha)
 */
exports.gerarAnaliseIA = onRequest({cors: true, secrets: [geminiApiKey], timeoutSeconds: 540, memory: '512MiB'}, async (req, res) => {
  try {
    console.log('=== INICIO gerarAnaliseIA v4 (NUNCA FALHA) ===');
    
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Nao autorizado' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (authError) {
      return res.status(401).json({ success: false, error: 'Token invalido' });
    }

    if (decodedToken.email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Apenas admin pode gerar analises' });
    }

    const { tipo, concurso, jogos } = req.body;

    if (!tipo) return res.status(400).json({ success: false, error: 'Campo "tipo" e obrigatorio' });
    if (!concurso) return res.status(400).json({ success: false, error: 'Campo "concurso" e obrigatorio' });
    if (!jogos || !Array.isArray(jogos) || jogos.length === 0) {
      return res.status(400).json({ success: false, error: 'Campo "jogos" deve ser um array com pelo menos 1 jogo' });
    }

    console.log(`Tipo: ${tipo}, Concurso: ${concurso}, Jogos: ${jogos.length}`);

    const GEMINI_KEY = geminiApiKey.value();
    if (!GEMINI_KEY) {
      console.log('Chave Gemini NAO encontrada - usando fallback');
      const fallback = gerarAnaliseFallback(tipo, concurso, jogos);
      return res.json({
        success: true,
        analise: {
          ...fallback,
          fontes: [],
          buscasRealizadas: [],
          geradaEm: new Date().toISOString(),
          modelo: 'fallback-local',
          versao: 'v4-fallback'
        }
      });
    }

    // ============================================================
    // ETAPA 1: Buscar H2H via API-Football (com timeout curto)
    // ============================================================
    let h2hData = {};
    if (tipo === 'programacao') {
      try {
        console.log('Etapa 1: Buscando H2H...');
        // Limitar a 4 jogos e com timeout global de 15s
        const h2hTimeout = setTimeout(() => {}, 15000);
        const h2hPromises = jogos.slice(0, 4).map(async (j, idx) => {
          const timeCasa = j.time1 || j.timeCasa || '';
          const timeFora = j.time2 || j.timeFora || '';
          if (!timeCasa || !timeFora) return null;
          await new Promise(resolve => setTimeout(resolve, idx * 600));
          return { idx: idx + 1, data: await buscarH2H(timeCasa, timeFora) };
        });
        
        const h2hResults = await Promise.race([
          Promise.all(h2hPromises),
          new Promise(resolve => setTimeout(() => resolve([]), 20000))
        ]);
        
        clearTimeout(h2hTimeout);
        if (Array.isArray(h2hResults)) {
          h2hResults.forEach(r => {
            if (r && r.data) h2hData[r.idx] = r.data;
          });
        }
        console.log(`H2H encontrados: ${Object.keys(h2hData).length}`);
      } catch (h2hError) {
        console.log('H2H falhou (nao critico):', h2hError.message);
      }
    }

    // ============================================================
    // ETAPA 2: Gerar prompt
    // ============================================================
    let prompt = '';
    if (tipo === 'programacao') {
      prompt = gerarPromptProgramacaoV3(concurso, jogos, h2hData);
    } else {
      prompt = gerarPromptResultadosV3(concurso, jogos);
    }
    console.log(`Prompt: ${prompt.length} chars`);

    // ============================================================
    // ETAPA 3: NIVEL 1 - Gemini COM Google Search Grounding
    // ============================================================
    // Deadline global: 480s (deixando 60s de margem do timeout de 540s)
    const globalDeadline = 480000;
    const globalStart = Date.now();

    console.log('NIVEL 1: Gemini + Google Search Grounding (5 tentativas, espera longa)...');
    let response = await chamarGemini(GEMINI_KEY, prompt, true, 5, globalDeadline);
    let usouGrounding = true;

    // ============================================================
    // ETAPA 4: NIVEL 2 - Gemini SEM Grounding (fallback)
    // ============================================================
    if (!response) {
      const elapsed = Date.now() - globalStart;
      const remaining = globalDeadline - elapsed;
      console.log(`NIVEL 1 falhou (${Math.round(elapsed/1000)}s). NIVEL 2: Gemini SEM Grounding (${Math.round(remaining/1000)}s restantes)...`);
      usouGrounding = false;
      response = await chamarGemini(GEMINI_KEY, prompt, false, 5, remaining);
    }

    // ============================================================
    // ETAPA 5: NIVEL 3 - Análise local sem IA (fallback final)
    // ============================================================
    if (!response) {
      console.log('NIVEL 2 falhou. NIVEL 3: Analise local (fallback)...');
      const fallback = gerarAnaliseFallback(tipo, concurso, jogos);
      console.log('=== FIM gerarAnaliseIA v4 - FALLBACK LOCAL ===');
      return res.json({
        success: true,
        analise: {
          ...fallback,
          fontes: [],
          buscasRealizadas: [],
          geradaEm: new Date().toISOString(),
          modelo: 'fallback-local',
          versao: 'v4-fallback'
        }
      });
    }

    // ============================================================
    // ETAPA 6: Processar resposta do Gemini
    // ============================================================
    console.log('Processando resposta do Gemini...');
    
    const candidate = response.data.candidates[0];
    const textoIA = candidate.content.parts[0].text;
    
    // Extrair fontes do grounding metadata (só existe se usou grounding)
    let fontes = [];
    let searchQueries = [];
    if (usouGrounding) {
      const groundingMetadata = candidate.groundingMetadata || {};
      searchQueries = groundingMetadata.webSearchQueries || [];
      const groundingChunks = groundingMetadata.groundingChunks || [];
      fontes = groundingChunks.map(chunk => ({
        titulo: chunk.web?.title || '',
        url: chunk.web?.uri || ''
      })).filter(f => f.titulo);
    }
    
    console.log(`Texto: ${textoIA.length} chars, Fontes: ${fontes.length}, Grounding: ${usouGrounding}`);

    // Parsear JSON
    let analise = extrairJSON(textoIA);

    // Se não conseguiu parsear, criar análise com o texto bruto
    if (!analise || !analise.resumo) {
      console.log('Parse JSON falhou - usando texto bruto');
      const linhas = textoIA.split('\n').filter(l => l.trim());
      analise = {
        resumo: linhas.slice(0, 2).join(' ').substring(0, 250),
        detalhada: textoIA,
        analiseJogos: [],
        resumoCartela: null
      };
    }

    // Garantir que analiseJogos existe e tem o formato correto
    if (!analise.analiseJogos) analise.analiseJogos = [];

    analise.analiseJogos = analise.analiseJogos.map((j, idx) => ({
      jogo: j.jogo || (idx + 1),
      timeCasa: j.timeCasa || '',
      timeFora: j.timeFora || '',
      historicoCasa: j.historicoCasa || '',
      historicoFora: j.historicoFora || '',
      consensoMercado: j.consensoMercado || '',
      contextoLocal: j.contextoLocal || '',
      analiseTecnica: j.analiseTecnica || '',
      h2h: j.h2h || (h2hData[idx + 1]?.texto || ''),
      palpite: j.palpite || '',
      confianca: j.confianca || 50,
      riscoZebra: j.riscoZebra || 'Medio',
      analise: j.analise || '',
      fontesUsadas: j.fontesUsadas || '',
      placar: j.placar || '',
      resultado: j.resultado || '',
      foiZebra: j.foiZebra || false,
      destaques: j.destaques || ''
    }));

    // Normalizar resumoCartela
    if (analise.resumoCartela) {
      analise.resumoCartela = {
        palpites: analise.resumoCartela.palpites || '',
        duplos: analise.resumoCartela.duplos || [],
        triplos: analise.resumoCartela.triplos || [],
        estrategia: analise.resumoCartela.estrategia || '',
        jogosChave: analise.resumoCartela.jogosChave || []
      };
    }

    console.log(`Resumo: ${analise.resumo?.substring(0, 80)}`);
    console.log(`Jogos: ${analise.analiseJogos?.length}, Cartela: ${!!analise.resumoCartela}`);
    console.log(`=== FIM gerarAnaliseIA v4 - SUCESSO (grounding=${usouGrounding}) ===`);
    
    return res.json({
      success: true,
      analise: {
        resumo: analise.resumo || 'Analise gerada com sucesso.',
        detalhada: analise.detalhada || textoIA,
        analiseJogos: analise.analiseJogos || [],
        resumoCartela: analise.resumoCartela || null,
        estatisticas: analise.estatisticas || null,
        fontes: fontes,
        buscasRealizadas: searchQueries,
        geradaEm: new Date().toISOString(),
        modelo: 'gemini-2.0-flash',
        versao: usouGrounding ? 'v4-grounding' : 'v4-sem-grounding'
      }
    });

  } catch (error) {
    // CATCH FINAL - Mesmo que algo inesperado aconteça, NUNCA retorna 500
    console.error('=== ERRO INESPERADO gerarAnaliseIA ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    // Tentar gerar fallback mesmo no catch
    try {
      const { tipo, concurso, jogos } = req.body;
      if (tipo && concurso && jogos) {
        const fallback = gerarAnaliseFallback(tipo, concurso, jogos);
        return res.json({
          success: true,
          analise: {
            ...fallback,
            fontes: [],
            buscasRealizadas: [],
            geradaEm: new Date().toISOString(),
            modelo: 'fallback-erro',
            versao: 'v4-fallback-erro'
          }
        });
      }
    } catch (fallbackError) {
      console.error('Ate o fallback falhou:', fallbackError.message);
    }
    
    // Ultimo recurso absoluto - retorna sucesso com analise minima
    return res.json({
      success: true,
      analise: {
        resumo: 'Analise temporariamente indisponivel. Use "Regenerar Analise IA" no admin.',
        detalhada: 'O servico de analise esta temporariamente indisponivel. Por favor, tente novamente usando o botao "Regenerar Analise IA" no painel administrativo.',
        analiseJogos: [],
        resumoCartela: null,
        estatisticas: null,
        fontes: [],
        buscasRealizadas: [],
        geradaEm: new Date().toISOString(),
        modelo: 'fallback-minimo',
        versao: 'v4-fallback-minimo'
      }
    });
  }
});

/**
 * Gera o prompt avançado para análise de PROGRAMAÇÃO (v3 - com Grounding)
 */
function gerarPromptProgramacaoV3(concurso, jogos, h2hData) {
  const jogosFormatados = jogos.map((j, idx) => {
    const time1 = j.time1 || j.timeCasa || 'Time 1';
    const time2 = j.time2 || j.timeFora || 'Time 2';
    const data = j.data || '';
    const num = idx + 1;
    
    let h2hInfo = '';
    if (h2hData[num]) {
      h2hInfo = `\n   H2H (API-Football): ${h2hData[num].texto}`;
    }
    
    return `Jogo ${num}: ${time1} (mandante) x ${time2} (visitante) - ${data}${h2hInfo}`;
  }).join('\n');

  return `Voce e o "Loteca Pro Analyst", uma IA especializada em inteligencia esportiva global focada na Loteca brasileira. Voce age como um scout internacional e analista de mercado de apostas de alta precisao.

INSTRUCAO CRITICA: Voce tem acesso ao Google Search. USE-O OBRIGATORIAMENTE para buscar informacoes REAIS e ATUALIZADAS sobre CADA jogo. Nao invente dados. Busque:

1. ODDS REAIS: Busque as odds atuais em sites como Bet365, Betano, Sportingbet, Betfair, Pinnacle, odds.com.br, oddspedia.com. Para cada jogo, informe as odds reais que encontrar.

2. NOTICIAS LOCAIS: Para cada jogo, busque noticias NO IDIOMA E NOS JORNAIS DO PAIS do jogo:
   - Brasil: ge.globo.com, uol.com.br/esporte, espn.com.br, lance.com.br, gazetaesportiva.com
   - Italia: gazzetta.it, corrieredellosport.it, tuttosport.com
   - Espanha: marca.com, as.com, mundodeportivo.com
   - Inglaterra: bbc.com/sport, skysports.com, theguardian.com/football
   - Franca: lequipe.fr, footmercato.net
   - Alemanha: kicker.de, bild.de/sport
   - Portugal: abola.pt, ojogo.pt, record.pt

3. HISTORICO RECENTE: Busque os ultimos 5 resultados reais de cada equipe.

4. LESOES E DESFALQUES: Busque jogadores lesionados, suspensos ou em duvida para cada time.

Analise a PROGRAMACAO do Concurso ${concurso} da Loteca:

${jogosFormatados}

FORMATO DE RESPOSTA - JSON puro (sem markdown, sem crases):

{
  "resumo": "Texto de ate 250 caracteres destacando os principais jogos, classicos e confrontos desta rodada. Mencione odds e favoritos.",
  "detalhada": "Analise em 3 paragrafos RICOS com dados reais. P1: visao geral da rodada com odds reais dos favoritos. P2: confrontos equilibrados, possiveis zebras e onde o mercado diverge. P3: contexto dos campeonatos, o que esta em jogo e impacto na classificacao. Separe paragrafos com duas quebras de linha. Cite fontes especificas.",
  "analiseJogos": [
    {
      "jogo": 1,
      "timeCasa": "Nome completo do time da casa",
      "timeFora": "Nome completo do time visitante",
      "historicoCasa": "V,V,E,D,V",
      "historicoFora": "D,E,V,D,D",
      "consensoMercado": "Odds REAIS encontradas. Ex: Bet365: Casa 1.75 / Empate 3.50 / Fora 4.20. Betano: Casa 1.80 / Empate 3.40 / Fora 4.00. Mercado confiante no mandante com odds baixas.",
      "contextoLocal": "Informacoes de bastidores com FONTE REAL. Ex: Segundo a Gazzetta dello Sport, o tecnico confirmou que poupara 3 titulares.",
      "analiseTecnica": "Analise cruzando forma real x odds x contexto local (2-3 linhas).",
      "h2h": "Ultimos confrontos diretos entre os times (dados reais).",
      "palpite": "1",
      "confianca": 75,
      "riscoZebra": "Baixo",
      "analise": "Texto completo da analise do jogo (3-5 linhas). Inclua odds reais, historico, fase dos times, jogadores-chave, desfalques e palpite fundamentado.",
      "fontesUsadas": "ge.globo.com, bet365.com, espn.com.br"
    }
  ],
  "resumoCartela": {
    "palpites": "1,1,X,1,2,X,1,1,1,X,1,1,1,1",
    "duplos": [
      { "jogo": 3, "opcoes": "1X", "motivo": "Odds proximas entre casa e empate." }
    ],
    "triplos": [
      { "jogo": 10, "opcoes": "1X2", "motivo": "Confronto totalmente imprevisivel." }
    ],
    "estrategia": "Texto explicando a estrategia com base nas odds reais.",
    "jogosChave": [3, 7, 10]
  }
}

REGRAS OBRIGATORIAS:
- USE O GOOGLE SEARCH para buscar dados reais de CADA jogo
- "analiseJogos" DEVE ter exatamente ${jogos.length} itens, um para cada jogo
- "palpite": use "1" (vitoria casa), "X" (empate) ou "2" (vitoria visitante)
- "confianca": numero inteiro de 50 a 95
- "riscoZebra": "Baixo", "Medio" ou "Alto"
- "historicoCasa"/"historicoFora": exatamente 5 resultados separados por virgula (V, E ou D)
- "resumoCartela.palpites": exatamente ${jogos.length} palpites separados por virgula
- "duplos": maximo 4 jogos
- "triplos": maximo 2 jogos
- "jogosChave": IDs dos 3-5 jogos mais decisivos
- Linguagem jornalistica profissional em portugues brasileiro
- NAO use markdown, apenas texto corrido dentro do JSON
- Responda APENAS com o JSON, sem texto antes ou depois`;
}

/**
 * Gera o prompt avançado para análise de RESULTADOS (v3 - com Grounding)
 */
function gerarPromptResultadosV3(concurso, jogos) {
  const jogosFormatados = jogos.map((j, idx) => {
    const time1 = j.time1 || j.timeCasa || 'Time 1';
    const time2 = j.time2 || j.timeFora || 'Time 2';
    const placar1 = j.placar1 !== undefined ? j.placar1 : '?';
    const placar2 = j.placar2 !== undefined ? j.placar2 : '?';
    return `Jogo ${idx + 1}: ${time1} (mandante) ${placar1} x ${placar2} ${time2} (visitante)`;
  }).join('\n');
  
  let vMandante = 0, empates = 0, vVisitante = 0;
  jogos.forEach(j => {
    const p1 = parseInt(j.placar1);
    const p2 = parseInt(j.placar2);
    if (p1 > p2) vMandante++;
    else if (p1 === p2) empates++;
    else vVisitante++;
  });

  return `Voce e o "Loteca Pro Analyst", uma IA especializada em inteligencia esportiva global focada na Loteca.

INSTRUCAO: Use o Google Search para buscar informacoes REAIS sobre os resultados: autores dos gols, lances importantes, cronicas dos jogos em jornais locais.

Analise os RESULTADOS do Concurso ${concurso} da Loteca:

${jogosFormatados}

Estatisticas da rodada:
- Vitorias do mandante: ${vMandante}
- Empates: ${empates}
- Vitorias do visitante: ${vVisitante}

Responda com JSON puro (sem markdown, sem crases):

{
  "resumo": "Texto de ate 250 caracteres com os destaques mais marcantes.",
  "detalhada": "Analise em 3 paragrafos com dados reais. Cite fontes. Separe paragrafos com duas quebras de linha.",
  "analiseJogos": [
    {
      "jogo": 1,
      "timeCasa": "Nome do time",
      "timeFora": "Nome do time",
      "placar": "2x1",
      "resultado": "1",
      "foiZebra": false,
      "destaques": "Autores dos gols reais, lances importantes.",
      "analise": "Analise completa com dados reais (3-5 linhas).",
      "fontesUsadas": "ge.globo.com, espn.com.br"
    }
  ],
  "estatisticas": {
    "mandantes": ${vMandante},
    "empates": ${empates},
    "visitantes": ${vVisitante},
    "zebras": 0,
    "goleadas": 0,
    "jogoDestaque": 1,
    "resumoEstatistico": "Resumo estatistico da rodada."
  }
}

REGRAS OBRIGATORIAS:
- USE O GOOGLE SEARCH para buscar dados reais
- "analiseJogos" DEVE ter exatamente ${jogos.length} itens
- "resultado": "1" (casa venceu), "X" (empate) ou "2" (visitante venceu)
- Linguagem jornalistica profissional em portugues brasileiro
- NAO use markdown, apenas texto corrido dentro do JSON
- Responda APENAS com o JSON, sem texto antes ou depois`;
}

/**
 * Extrai JSON de forma robusta do texto retornado pela IA
 */
function extrairJSON(textoIA) {
  let textoLimpo = textoIA.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Tentativa 1: Parse direto
  try {
    const analise = JSON.parse(textoLimpo);
    console.log('JSON: parse direto OK');
    return analise;
  } catch (e) {}
  
  // Tentativa 2: Extrair JSON do texto
  const jsonMatch = textoLimpo.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const analise = JSON.parse(jsonMatch[0]);
      console.log('JSON: regex OK');
      return analise;
    } catch (e) {
      // Tentativa 2b: Limpar caracteres de controle
      try {
        let jsonStr = jsonMatch[0];
        jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, (match) => {
          if (match === '\n') return '\\n';
          if (match === '\r') return '';
          if (match === '\t') return ' ';
          return '';
        });
        const analise = JSON.parse(jsonStr);
        console.log('JSON: limpeza OK');
        return analise;
      } catch (e2) {}
    }
  }
  
  // Tentativa 3: Corrigir JSON truncado
  try {
    let jsonStr = textoLimpo;
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    
    for (let i = 0; i < openBrackets - closeBrackets; i++) jsonStr += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) jsonStr += '}';
    
    const analise = JSON.parse(jsonStr);
    console.log('JSON: truncamento corrigido OK');
    return analise;
  } catch (e) {}
  
  console.log('JSON: todas tentativas falharam');
  return null;
}


// ============================================================
// MERCADO DA BOLA - Busca automática de notícias via Gemini
// ============================================================

/**
 * Cloud Function para buscar notícias de mercado (transferências, lesões, rumores)
 * Usa Gemini 2.0 Flash com Google Search Grounding para buscar em portais esportivos reais
 * 
 * Pode ser chamada:
 * 1. Automaticamente após publicação de concurso
 * 2. Manualmente pelo admin via botão "Atualizar Mercado"
 * 3. Por qualquer usuário autenticado (leitura do cache)
 */
exports.buscarMercado = onRequest({cors: true, secrets: [geminiApiKey], timeoutSeconds: 300, memory: '512MiB'}, async (req, res) => {
  try {
    console.log('=== INICIO buscarMercado ===');
    
    const { concurso, jogos, forceRefresh } = req.body;

    if (!concurso) {
      return res.status(400).json({ success: false, error: 'Campo "concurso" e obrigatorio' });
    }

    // Verificar se já existe cache recente (menos de 6 horas) - exceto se forceRefresh
    if (!forceRefresh) {
      try {
        const mercadoDoc = await db.collection('mercado').doc(concurso).get();
        if (mercadoDoc.exists) {
          const data = mercadoDoc.data();
          const atualizadoEm = data.atualizadoEm?.toDate ? data.atualizadoEm.toDate() : new Date(data.atualizadoEm);
          const horasDesdeAtualizacao = (Date.now() - atualizadoEm.getTime()) / (1000 * 60 * 60);
          
          if (horasDesdeAtualizacao < 6) {
            console.log(`Cache valido encontrado (${horasDesdeAtualizacao.toFixed(1)}h). Retornando cache.`);
            return res.json({
              success: true,
              mercado: data,
              fromCache: true
            });
          }
        }
      } catch (cacheError) {
        console.log('Erro ao verificar cache:', cacheError.message);
      }
    }

    // Se não tem jogos no body, buscar do concurso publicado
    let jogosParaBuscar = jogos;
    if (!jogosParaBuscar || !Array.isArray(jogosParaBuscar) || jogosParaBuscar.length === 0) {
      try {
        const concursoDoc = await db.collection('concursos_publicados').doc(concurso).get();
        if (concursoDoc.exists) {
          jogosParaBuscar = concursoDoc.data().jogos || [];
        }
      } catch (e) {
        console.log('Erro ao buscar jogos do concurso:', e.message);
      }
    }

    if (!jogosParaBuscar || jogosParaBuscar.length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum jogo encontrado para o concurso' });
    }

    // Extrair todos os times
    const times = [];
    jogosParaBuscar.forEach(j => {
      const casa = j.time1 || j.timeCasa || '';
      const fora = j.time2 || j.timeFora || '';
      if (casa) times.push(casa);
      if (fora) times.push(fora);
    });

    console.log(`Times encontrados: ${times.length} - ${times.join(', ')}`);

    // Identificar países/ligas para direcionar buscas
    const timesFormatados = jogosParaBuscar.map((j, idx) => {
      const casa = j.time1 || j.timeCasa || 'Time Casa';
      const fora = j.time2 || j.timeFora || 'Time Fora';
      return `Jogo ${idx + 1}: ${casa} x ${fora}`;
    }).join('\n');

    // Gerar prompt para buscar notícias de mercado
    const prompt = gerarPromptMercado(concurso, timesFormatados, times);
    
    const GEMINI_KEY = geminiApiKey.value();
    console.log('Chamando Gemini com Search Grounding para buscar noticias de mercado...');

    // Tentar com Grounding primeiro (busca real na web)
    let response = await chamarGemini(GEMINI_KEY, prompt, true, 3, 240000);
    let usouGrounding = true;

    // Fallback sem grounding
    if (!response) {
      console.log('Grounding falhou. Tentando sem grounding...');
      usouGrounding = false;
      response = await chamarGemini(GEMINI_KEY, prompt, false, 3, 60000);
    }

    if (!response) {
      console.log('Gemini indisponivel. Retornando mercado vazio.');
      const mercadoVazio = {
        concurso,
        destaque: [],
        rumores: [],
        lesoes: [],
        impacto: 'Servico de busca de noticias temporariamente indisponivel. Tente atualizar novamente em alguns minutos.',
        fontes: [],
        atualizadoEm: new Date().toISOString(),
        modelo: 'indisponivel'
      };
      return res.json({ success: true, mercado: mercadoVazio, fromCache: false });
    }

    // Processar resposta
    const candidate = response.data.candidates[0];
    const textoIA = candidate.content.parts[0].text;
    
    // Extrair fontes do grounding
    let fontes = [];
    if (usouGrounding) {
      const groundingMetadata = candidate.groundingMetadata || {};
      const groundingChunks = groundingMetadata.groundingChunks || [];
      fontes = groundingChunks.map(chunk => ({
        titulo: chunk.web?.title || '',
        url: chunk.web?.uri || ''
      })).filter(f => f.titulo);
    }

    console.log(`Resposta recebida: ${textoIA.length} chars, Fontes: ${fontes.length}`);

    // Parsear JSON da resposta
    let mercadoData = extrairJSON(textoIA);

    if (!mercadoData) {
      console.log('Falha ao parsear JSON do mercado. Usando texto bruto.');
      mercadoData = {
        destaque: [],
        rumores: [],
        lesoes: [],
        impacto: textoIA.substring(0, 1000)
      };
    }

    // Normalizar e validar dados
    const mercadoFinal = {
      concurso,
      destaque: Array.isArray(mercadoData.destaque) ? mercadoData.destaque.map(t => ({
        jogador: t.jogador || 'Jogador',
        de: t.de || 'Clube anterior',
        para: t.para || 'Novo clube',
        valor: t.valor || '',
        data: t.data || '',
        impactoLoteca: t.impactoLoteca || '',
        fonte: t.fonte || ''
      })) : [],
      rumores: Array.isArray(mercadoData.rumores) ? mercadoData.rumores.map(r => ({
        jogador: r.jogador || 'Jogador',
        descricao: r.descricao || '',
        probabilidade: r.probabilidade || 'media',
        fonte: r.fonte || '',
        impactoLoteca: r.impactoLoteca || ''
      })) : [],
      lesoes: Array.isArray(mercadoData.lesoes) ? mercadoData.lesoes.map(l => ({
        jogador: l.jogador || 'Jogador',
        time: l.time || '',
        descricao: l.descricao || '',
        previsao: l.previsao || 'Indefinida',
        gravidade: l.gravidade || 'media',
        impactoLoteca: l.impactoLoteca || ''
      })) : [],
      impacto: mercadoData.impacto || 'Analise de impacto indisponivel.',
      fontes: fontes,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEmISO: new Date().toISOString(),
      modelo: usouGrounding ? 'gemini-2.0-flash-grounding' : 'gemini-2.0-flash',
      totalNoticias: (mercadoData.destaque?.length || 0) + (mercadoData.rumores?.length || 0) + (mercadoData.lesoes?.length || 0)
    };

    // Salvar no Firestore
    await db.collection('mercado').doc(concurso).set(mercadoFinal);
    console.log(`Mercado salvo no Firestore para concurso ${concurso}. Total: ${mercadoFinal.totalNoticias} noticias.`);

    console.log('=== FIM buscarMercado - SUCESSO ===');
    return res.json({
      success: true,
      mercado: {
        ...mercadoFinal,
        atualizadoEm: mercadoFinal.atualizadoEmISO
      },
      fromCache: false
    });

  } catch (error) {
    console.error('=== ERRO buscarMercado ===', error.message);
    return res.json({
      success: true,
      mercado: {
        concurso: req.body?.concurso || '',
        destaque: [],
        rumores: [],
        lesoes: [],
        impacto: 'Erro ao buscar noticias de mercado. Tente novamente.',
        fontes: [],
        atualizadoEm: new Date().toISOString(),
        modelo: 'erro'
      },
      fromCache: false
    });
  }
});

/**
 * Gera o prompt para buscar notícias de mercado nos portais esportivos
 */
function gerarPromptMercado(concurso, jogosFormatados, times) {
  return `Voce e o "Loteca Pro Market Analyst", uma IA especializada em inteligencia de mercado do futebol focada nos times que disputam a Loteca brasileira.

INSTRUCAO CRITICA: Voce tem acesso ao Google Search. USE-O OBRIGATORIAMENTE para buscar noticias REAIS e ATUALIZADAS sobre CADA time listado abaixo. Nao invente dados.

TIMES DO CONCURSO ${concurso} DA LOTECA:
${jogosFormatados}

BUSQUE NOTICIAS NOS PORTAIS ESPORTIVOS NATIVOS DE CADA PAIS:
- Brasil: ge.globo.com, uol.com.br/esporte, espn.com.br, lance.com.br, gazetaesportiva.com, tntsports.com.br
- Italia: gazzetta.it, corrieredellosport.it, tuttosport.com, football-italia.net
- Espanha: marca.com, as.com, mundodeportivo.com, sport.es
- Inglaterra: bbc.com/sport, skysports.com, theguardian.com/football, mirror.co.uk/sport
- Franca: lequipe.fr, footmercato.net, rmcsport.bfmtv.com
- Alemanha: kicker.de, bild.de/sport, transfermarkt.de
- Portugal: abola.pt, ojogo.pt, record.pt
- Argentina: ole.com.ar, tycsports.com, dobleamarilla.com.ar

BUSQUE ESPECIFICAMENTE:
1. TRANSFERENCIAS CONFIRMADAS: Jogadores que foram contratados ou vendidos recentemente por qualquer um dos ${times.length} times
2. RUMORES DE TRANSFERENCIA: Negociacoes em andamento, jogadores na mira, propostas recebidas
3. LESOES E DESFALQUES: Jogadores lesionados, suspensos, em recuperacao ou em duvida para os proximos jogos
4. IMPACTO NA LOTECA: Como essas movimentacoes afetam os jogos do concurso

FORMATO DE RESPOSTA - JSON puro (sem markdown, sem crases):

{
  "destaque": [
    {
      "jogador": "Nome completo do jogador",
      "de": "Clube de origem",
      "para": "Clube de destino",
      "valor": "Valor da transferencia (ex: 15M EUR) ou vazio se nao divulgado",
      "data": "Data da confirmacao (ex: 10/02/2026)",
      "impactoLoteca": "Como isso afeta os jogos da Loteca (1-2 frases)",
      "fonte": "Nome do portal onde encontrou a noticia"
    }
  ],
  "rumores": [
    {
      "jogador": "Nome do jogador",
      "descricao": "Descricao do rumor (de onde para onde, valores especulados, etc)",
      "probabilidade": "alta, media ou baixa",
      "fonte": "Portal de origem da noticia",
      "impactoLoteca": "Como isso pode afetar os jogos da Loteca"
    }
  ],
  "lesoes": [
    {
      "jogador": "Nome do jogador",
      "time": "Nome do time",
      "descricao": "Tipo de lesao ou motivo da ausencia (lesao muscular, suspensao, etc)",
      "previsao": "Previsao de retorno (ex: 2-3 semanas, proximo jogo, indefinida)",
      "gravidade": "alta, media ou baixa",
      "impactoLoteca": "Como a ausencia deste jogador afeta o jogo da Loteca"
    }
  ],
  "impacto": "Texto de 3-5 paragrafos analisando como TODAS as movimentacoes de mercado (transferencias, rumores e lesoes) impactam os jogos deste concurso da Loteca. Seja especifico: mencione jogos, times e jogadores. Indique quais jogos ficam mais incertos por causa de desfalques e quais times se reforcaram. Separe paragrafos com duas quebras de linha."
}

REGRAS OBRIGATORIAS:
- USE O GOOGLE SEARCH para buscar dados reais de CADA time
- Inclua APENAS noticias REAIS encontradas na busca, NAO invente transferencias ou lesoes
- Se nao encontrar noticias relevantes para algum time, NAO inclua dados falsos
- "destaque" deve ter entre 0 e 10 transferencias confirmadas
- "rumores" deve ter entre 0 e 10 rumores relevantes
- "lesoes" deve ter entre 0 e 15 lesoes/desfalques relevantes
- Priorize noticias dos ultimos 7 dias
- "probabilidade" em rumores: "alta" (negociacao avancada), "media" (interesse confirmado), "baixa" (especulacao)
- "gravidade" em lesoes: "alta" (titular, longa ausencia), "media" (titular, curta ausencia), "baixa" (reserva ou duvida)
- Linguagem jornalistica profissional em portugues brasileiro
- NAO use markdown, apenas texto corrido dentro do JSON
- Responda APENAS com o JSON, sem texto antes ou depois`;
}


// ============================================================
// CARTOLA FC - Proxy para API do Cartola (evita CORS)
// ============================================================

exports.cartolaProxy = onRequest({cors: true, timeoutSeconds: 30, memory: '128MiB'}, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    const validEndpoints = [
      'mercado/status',
      'atletas/pontuados',
      'partidas',
      'mercado/destaques',
      'pos-rodada/destaques'
    ];
    
    const ep = endpoint || 'mercado/status';
    if (!validEndpoints.includes(ep)) {
      return res.status(400).json({ success: false, error: 'Endpoint invalido' });
    }
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`https://api.cartola.globo.com/${ep}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://cartola.globo.com',
        'Referer': 'https://cartola.globo.com/'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ success: false, error: `API Cartola retornou ${response.status}` });
    }
    
    const data = await response.json();
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Erro no proxy Cartola:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
