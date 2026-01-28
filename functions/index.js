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
        
        // Buscar o hash atual da página
        const url = 'https://loterias.caixa.gov.br/Paginas/Loteca.aspx';
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        
        // Calcular hash simples do conteúdo
        const contentHash = Buffer.from(response.data).toString('base64').substring(0, 50);
        
        // Buscar último hash salvo
        const monitorDoc = await db.collection('sistema').doc('monitor').get();
        const lastHash = monitorDoc.exists ? monitorDoc.data().lastHash : null;
        
        // Se mudou, enviar alerta
        if (lastHash && lastHash !== contentHash) {
            await enviarAlerta('NOVA ATUALIZAÇÃO DETECTADA NA LOTECA!', 
                `O site da Caixa foi atualizado. Acesse o painel admin para atualizar os dados:\n\n` +
                `https://loteca-pro-mateus-1767825041.web.app?page=admin`
            );
        }
        
        // Salvar novo hash
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
        // Verificar autenticação
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Não autorizado' });
        }
        
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Verificar se é o admin
        if (decodedToken.email !== ADMIN_EMAIL) {
            return res.status(403).json({ success: false, error: 'Acesso negado' });
        }
        
        const { htmlContent, tipo } = req.body; // tipo: 'programacao' ou 'resultados'
        
        if (!htmlContent || !tipo) {
            return res.status(400).json({ success: false, error: 'Dados incompletos' });
        }
        
        // Processar HTML e extrair dados
        const cheerio = require('cheerio');
        const $ = cheerio.load(htmlContent);
        
        let dados = {};
        
        if (tipo === 'programacao') {
            // Extrair programação
            const jogos = [];
            $('table tbody tr').each((i, elem) => {
                if (i >= 14) return; // Apenas 14 jogos
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
            // Extrair resultados
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
                        resultado: $(cols[3]).text().trim() // 1, X ou 2
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
 * Função auxiliar para enviar alertas por e-mail
 * Nota: Requer configuração do SendGrid ou similar
 */
async function enviarAlerta(assunto, mensagem) {
    try {
        // Salvar alerta no Firestore para o admin ver no painel
        await db.collection('alertas').add({
            para: ADMIN_EMAIL,
            assunto,
            mensagem,
            lido: false,
            dataEnvio: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Alerta salvo: ${assunto}`);
        
        // TODO: Integrar com SendGrid ou serviço de e-mail
        // Por enquanto, apenas salva no Firestore
        
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
 * Protege a chave da API no servidor
 */
exports.gerarAnaliseIA = onRequest({cors: true, secrets: [geminiApiKey]}, async (req, res) => {
  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Não autorizado' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Verificar se é admin
    if (decodedToken.email !== ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Apenas admin pode gerar análises' });
    }

    const { tipo, concurso, jogos } = req.body;

    // Log detalhado para debug
    console.log('Dados recebidos:', { tipo, concurso, jogosLength: jogos?.length });

    if (!tipo) {
      return res.status(400).json({ success: false, error: 'Campo "tipo" é obrigatório' });
    }
    
    if (!concurso) {
      return res.status(400).json({ success: false, error: 'Campo "concurso" é obrigatório' });
    }
    
    if (!jogos || !Array.isArray(jogos) || jogos.length === 0) {
      return res.status(400).json({ success: false, error: 'Campo "jogos" deve ser um array com pelo menos 1 jogo' });
    }

    // Pegar chave do Gemini do secret
    const GEMINI_API_KEY = geminiApiKey.value();

    if (!GEMINI_API_KEY) {
      throw new Error('Chave do Gemini não configurada');
    }

    // Gerar prompt baseado no tipo
    let prompt = '';
    if (tipo === 'programacao') {
      prompt = `Você é um analista especializado em futebol brasileiro e Loteca.

Analise a programação do Concurso ${concurso} da Loteca com os seguintes jogos:

${jogos.map((j, idx) => `${idx + 1}. ${j.time1} x ${j.time2} (${j.data})`).join('\n')}

IMPORTANTE:
- Time1 é o MANDANTE (joga em casa)
- Time2 é o VISITANTE (joga fora)

Gere uma análise em formato JSON com:
{
  "resumo": "Texto de até 3 linhas resumindo os destaques do concurso",
  "detalhada": "Análise completa do concurso (3-4 parágrafos)"
}

Foque em: clássicos, derbies, confrontos importantes, times em boa fase.`;
    } else {
      prompt = `Você é um analista especializado em futebol brasileiro e Loteca.

Analise os resultados do Concurso ${concurso} da Loteca:

${jogos.map((j, idx) => `${idx + 1}. ${j.time1} ${j.placar1} x ${j.placar2} ${j.time2}`).join('\n')}

IMPORTANTE:
- Time1 é o MANDANTE (jogou em casa)
- Time2 é o VISITANTE (jogou fora)
- Placar1 é do mandante, Placar2 é do visitante

Gere uma análise em formato JSON com:
{
  "resumo": "Texto de até 3 linhas resumindo os resultados",
  "detalhada": "Análise completa dos resultados (3-4 parágrafos)"
}

Foque em: zebras, goleadas, vitórias importantes, estatísticas.`;
    }

    // Chamar API do Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    const textoIA = response.data.candidates[0].content.parts[0].text;

    // Extrair JSON da resposta
    const jsonMatch = textoIA.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('IA não retornou JSON válido');
    }

    const analise = JSON.parse(jsonMatch[0]);

    res.json({
      success: true,
      analise: {
        resumo: analise.resumo,
        detalhada: analise.detalhada,
        geradaEm: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Erro ao gerar análise:', error);
    
    // Retornar status apropriado baseado no tipo de erro
    const statusCode = error.message.includes('obrigatório') || 
                       error.message.includes('inválido') ? 400 : 500;
    
    res.status(statusCode).json({ 
      success: false, 
      error: error.message || 'Erro ao gerar análise'
    });
  }
});
