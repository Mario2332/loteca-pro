const {onRequest} = require('firebase-functions/v2/https');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const axios = require('axios');

// Definir secret para a chave do Gemini
const geminiApiKey = defineSecret('GEMINI_API_KEY');

admin.initializeApp();
const db = admin.firestore();

// E-mail do administrador para receber alertas
const ADMIN_EMAIL = 'mateusmachado11m@gmail.com';

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

/**
 * Cloud Function para gerar análise com IA (Gemini)
 * Usa API v1 com modelo gemini-2.0-flash
 * Gera: resumo curto, análise detalhada, e análise individual por jogo
 */
exports.gerarAnaliseIA = onRequest({cors: true, secrets: [geminiApiKey]}, async (req, res) => {
  try {
    console.log('=== INÍCIO gerarAnaliseIA ===');
    
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log('Token verificado para:', decodedToken.email);
    } catch (authError) {
      console.error('Erro ao verificar token:', authError.message);
      return res.status(401).json({ success: false, error: 'Token inválido' });
    }

    if (decodedToken.email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Apenas admin pode gerar análises' });
    }

    const { tipo, concurso, jogos } = req.body;

    console.log('Dados recebidos:', JSON.stringify({ tipo, concurso, jogosCount: jogos?.length }));

    if (!tipo) return res.status(400).json({ success: false, error: 'Campo "tipo" é obrigatório' });
    if (!concurso) return res.status(400).json({ success: false, error: 'Campo "concurso" é obrigatório' });
    if (!jogos || !Array.isArray(jogos) || jogos.length === 0) {
      return res.status(400).json({ success: false, error: 'Campo "jogos" deve ser um array com pelo menos 1 jogo' });
    }

    const GEMINI_API_KEY = geminiApiKey.value();
    console.log('Chave Gemini obtida:', GEMINI_API_KEY ? 'SIM' : 'NÃO');

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Chave do Gemini não configurada' });
    }

    // Gerar prompt baseado no tipo
    let prompt = '';
    
    if (tipo === 'programacao') {
      const jogosFormatados = jogos.map((j, idx) => {
        const time1 = j.time1 || j.timeCasa || 'Time 1';
        const time2 = j.time2 || j.timeFora || 'Time 2';
        const data = j.data || '';
        return `Jogo ${idx + 1}: ${time1} (mandante) x ${time2} (visitante) - ${data}`;
      }).join('\n');
      
      prompt = `Você é um jornalista esportivo especializado em futebol brasileiro, com conhecimento profundo sobre todos os campeonatos estaduais, Série A, B, C e D do Brasileirão, Copa do Brasil e competições internacionais.

Analise a PROGRAMAÇÃO do Concurso ${concurso} da Loteca com os seguintes jogos:

${jogosFormatados}

Gere uma análise completa no seguinte formato JSON. Responda APENAS com o JSON puro, sem markdown, sem crases, sem texto antes ou depois:

{
  "resumo": "Texto de até 3 linhas (máximo 250 caracteres) destacando os principais jogos, clássicos e confrontos mais atrativos desta rodada.",
  "detalhada": "Análise em 3 parágrafos. Primeiro parágrafo: visão geral da rodada, destacando os clássicos e jogos mais importantes. Segundo parágrafo: análise dos confrontos mais equilibrados e possíveis zebras. Terceiro parágrafo: contexto dos campeonatos e o que está em jogo para os times."
}

REGRAS:
- Use linguagem jornalística profissional, como se fosse uma matéria do Globo Esporte
- Mencione o contexto atual dos times (fase boa/ruim, posição na tabela, etc.)
- Destaque clássicos regionais e rivalidades históricas
- NÃO use markdown no texto, apenas texto corrido
- Separe parágrafos com \\n\\n`;

    } else {
      // RESULTADOS - prompt completo com análise por jogo
      const jogosFormatados = jogos.map((j, idx) => {
        const time1 = j.time1 || j.timeCasa || 'Time 1';
        const time2 = j.time2 || j.timeFora || 'Time 2';
        const placar1 = j.placar1 !== undefined ? j.placar1 : '?';
        const placar2 = j.placar2 !== undefined ? j.placar2 : '?';
        return `Jogo ${idx + 1}: ${time1} (mandante) ${placar1} x ${placar2} ${time2} (visitante)`;
      }).join('\n');
      
      // Calcular estatísticas
      let vMandante = 0, empates = 0, vVisitante = 0;
      jogos.forEach(j => {
        const p1 = parseInt(j.placar1);
        const p2 = parseInt(j.placar2);
        if (p1 > p2) vMandante++;
        else if (p1 === p2) empates++;
        else vVisitante++;
      });
      
      prompt = `Você é um jornalista esportivo especializado em futebol brasileiro, com conhecimento profundo sobre todos os campeonatos. Você acompanha os jogos pelos principais veículos: Globo Esporte, ESPN, ge.globo.com, UOL Esporte, Lance.

Analise os RESULTADOS do Concurso ${concurso} da Loteca:

${jogosFormatados}

Estatísticas da rodada:
- Vitórias do mandante: ${vMandante}
- Empates: ${empates}
- Vitórias do visitante: ${vVisitante}

Gere uma análise COMPLETA no seguinte formato JSON. Responda APENAS com o JSON puro, sem markdown, sem crases, sem texto antes ou depois:

{
  "resumo": "Texto de até 3 linhas (máximo 250 caracteres) com os destaques mais marcantes da rodada: zebras, goleadas, resultados surpreendentes.",
  "detalhada": "Análise em 3 parágrafos. Primeiro parágrafo: panorama geral da rodada, resultados mais marcantes e tendências (mandantes vs visitantes). Segundo parágrafo: as maiores surpresas e zebras, resultados que ninguém esperava. Terceiro parágrafo: destaques individuais, goleadas e o impacto nos campeonatos. Separe os parágrafos com \\n\\n.",
  "analiseJogos": [
    {
      "jogo": 1,
      "analise": "Análise de até 5 linhas sobre este jogo específico. Inclua: quem fez os gols (invente nomes realistas de jogadores se não souber os reais), como foi o jogo (dominante, equilibrado, virada), se o resultado foi esperado ou surpreendente, e contexto do confronto. Exemplo: 'O Corinthians dominou o Flamengo desde o início, com gols de Yuri Alberto (aos 15min) e Romero (aos 67min). Resultado surpreendente já que o Flamengo era favorito jogando em casa. O Timão mostrou solidez defensiva e eficiência no contra-ataque.'"
    }
  ]
}

REGRAS IMPORTANTES:
- O array "analiseJogos" DEVE ter exatamente ${jogos.length} itens, um para cada jogo
- Cada análise de jogo deve ter entre 3 e 5 linhas
- Mencione autores dos gols (use nomes de jogadores conhecidos dos elencos atuais)
- Analise se o resultado foi esperado (favorito venceu) ou zebra (azarão venceu)
- Use linguagem jornalística profissional
- NÃO use markdown no texto, apenas texto corrido
- Goleadas (3+ gols de diferença) merecem destaque especial
- Empates em clássicos são sempre notáveis
- Vitórias de visitante são sempre mais difíceis e merecem destaque`;
    }

    console.log('Prompt gerado, chamando API do Gemini...');

    // Chamar API do Gemini
    let response;
    try {
      response = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192
          }
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 90000
        }
      );
      console.log('Resposta da API recebida com sucesso');
    } catch (apiError) {
      console.error('Erro na chamada da API Gemini:', apiError.message);
      if (apiError.response) {
        console.error('Status:', apiError.response.status);
        console.error('Data:', JSON.stringify(apiError.response.data));
      }
      return res.status(500).json({ 
        success: false, 
        error: `Erro na API do Gemini: ${apiError.message}`
      });
    }

    // Extrair texto da resposta
    if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
      console.error('Resposta em formato inesperado:', JSON.stringify(response.data));
      return res.status(500).json({ success: false, error: 'Resposta da API em formato inesperado' });
    }

    const textoIA = response.data.candidates[0].content.parts[0].text;
    console.log('Texto da IA recebido (primeiros 300 chars):', textoIA.substring(0, 300));

    // Extrair JSON da resposta - limpeza robusta
    let analise = null;
    
    // Remover markdown se presente
    let textoLimpo = textoIA.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Tentar extrair JSON
    const jsonMatch = textoLimpo.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        analise = JSON.parse(jsonMatch[0]);
        console.log('JSON extraído com sucesso via parse direto');
      } catch (parseError) {
        console.log('Parse direto falhou, tentando limpar newlines...');
        try {
          // Substituir newlines dentro de strings por espaços
          let jsonStr = jsonMatch[0];
          // Estratégia: substituir \n que estão dentro de valores de string
          jsonStr = jsonStr.replace(/\n/g, '\\n');
          analise = JSON.parse(jsonStr);
          console.log('JSON extraído com sucesso após limpar newlines');
        } catch (parseError2) {
          console.error('Erro ao parsear JSON mesmo após limpeza:', parseError2.message);
          console.error('Texto (primeiros 500):', jsonMatch[0].substring(0, 500));
        }
      }
    }

    // Se não conseguiu parsear, criar análise com o texto bruto
    if (!analise || !analise.resumo) {
      console.log('Usando texto como análise direta (fallback)');
      const linhas = textoIA.split('\n').filter(l => l.trim());
      analise = {
        resumo: linhas.slice(0, 2).join(' ').substring(0, 250),
        detalhada: linhas.slice(2).join('\n'),
        analiseJogos: []
      };
    }

    // Garantir que analiseJogos existe
    if (!analise.analiseJogos) {
      analise.analiseJogos = [];
    }

    console.log('Resumo:', analise.resumo?.substring(0, 100));
    console.log('Detalhada:', analise.detalhada?.substring(0, 100));
    console.log('Jogos analisados:', analise.analiseJogos?.length || 0);
    console.log('=== FIM gerarAnaliseIA - SUCESSO ===');
    
    res.json({
      success: true,
      analise: {
        resumo: analise.resumo || 'Análise gerada com sucesso.',
        detalhada: analise.detalhada || textoIA,
        analiseJogos: analise.analiseJogos || [],
        geradaEm: new Date().toISOString(),
        modelo: 'gemini-2.0-flash'
      }
    });

  } catch (error) {
    console.error('=== ERRO gerarAnaliseIA ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      success: false, 
      error: `Erro interno: ${error.message}`
    });
  }
});
