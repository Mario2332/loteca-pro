// Bookmarklet v2 - Loteca Pro (com informações adicionais)
(function() {
    const url = window.location.href;
    const text = document.body.textContent;
    let data = {};
    
    if (url.includes('Programacao-Loteca')) {
        // PROGRAMAÇÃO
        // Buscar número do concurso
        const concursoMatch = text.match(/Concurso\s+(\d+)/);
        const concurso = concursoMatch ? concursoMatch[1] : '';
        
        // Extrair data do concurso
        const dataConcursoMatch = text.match(/Concurso\s+\d+\s+\(([^)]+)\)/);
        const dataConcurso = dataConcursoMatch ? dataConcursoMatch[1] : '';
        
        // Extrair período de apostas
        const periodoMatch = text.match(/Período de apostas:\s*(.+?)(?=Realização|$)/s);
        const periodoApostas = periodoMatch ? periodoMatch[1].trim().replace(/\s+/g, ' ') : '';
        
        // Extrair realização dos jogos
        const realizacaoMatch = text.match(/Realização dos jogos de futebol:\s*(.+?)(?=\n|Jogo|$)/);
        const realizacaoJogos = realizacaoMatch ? realizacaoMatch[1].trim() : '';
        
        // Extrair jogos da tabela
        const table = document.querySelector('table');
        const jogos = [];
        
        if (table) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach((row, idx) => {
                const cells = row.querySelectorAll('td');
                // Estrutura: [0]=jogo, [1]=vazio, [2]=time1, [3]=vazio, [4]=time2, [5]=vazio, [6]=data, [7]=extra
                if (cells.length >= 7) {
                    jogos.push({
                        jogo: idx + 1,
                        time1: cells[2].textContent.trim(),  // Coluna 1 (mandante)
                        time2: cells[4].textContent.trim(),  // Coluna 2 (visitante)
                        data: cells[6].textContent.trim()    // Data
                    });
                }
            });
        }
        
        data = {
            tipo: 'programacao',
            concurso: concurso,
            dataConcurso: dataConcurso,
            periodoApostas: periodoApostas,
            realizacaoJogos: realizacaoJogos,
            jogos: jogos
        };
        
    } else if (url.includes('Loteca.aspx')) {
        // RESULTADOS
        // Buscar número do concurso
        const concursoMatch = text.match(/Concurso\s+(\d+)/);
        const concurso = concursoMatch ? concursoMatch[1] : '';
        
        // Extrair estimativa de prêmio
        const premioMatch = text.match(/Estimativa de prêmio do próximo concurso[^R]*R\$\s*([\d.,]+)/);
        const estimativaPremio = premioMatch ? premioMatch[1] : '';
        
        // Extrair data limite de vendas
        const dataVendasMatch = text.match(/com vendas até\s+(\d{2}\/\d{2}\/\d{4})/);
        const dataLimiteVendas = dataVendasMatch ? dataVendasMatch[1] : '';
        
        // Extrair jogos da tabela
        const table = document.querySelector('table');
        const jogos = [];
        
        if (table) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach((row, idx) => {
                const cells = row.querySelectorAll('td');
                // Estrutura similar, mas com placares
                if (cells.length >= 7) {
                    jogos.push({
                        jogo: idx + 1,
                        time1: cells[2].textContent.trim(),
                        placar1: cells[3].textContent.trim(),
                        time2: cells[4].textContent.trim(),
                        placar2: cells[5].textContent.trim(),
                        data: cells[6].textContent.trim()
                    });
                }
            });
        }
        
        data = {
            tipo: 'resultado',
            concurso: concurso,
            estimativaPremio: estimativaPremio,
            dataLimiteVendas: dataLimiteVendas,
            jogos: jogos
        };
        
    } else {
        alert('❌ Por favor, acesse a página de Programação ou Resultados da Loteca!');
        return;
    }
    
    // Copiar para clipboard
    const jsonStr = JSON.stringify(data, null, 2);
    
    // Criar textarea temporário
    const textarea = document.createElement('textarea');
    textarea.value = jsonStr;
    textarea.style.position = 'fixed';
    textarea.style.top = '50%';
    textarea.style.left = '50%';
    textarea.style.transform = 'translate(-50%, -50%)';
    textarea.style.width = '80%';
    textarea.style.height = '60%';
    textarea.style.padding = '20px';
    textarea.style.fontSize = '14px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.border = '3px solid #667eea';
    textarea.style.borderRadius = '10px';
    textarea.style.zIndex = '999999';
    textarea.style.backgroundColor = 'white';
    textarea.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    
    // Overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.zIndex = '999998';
    document.body.appendChild(overlay);
    
    // Mensagem de sucesso
    const msg = document.createElement('div');
    msg.innerHTML = '<div style="position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#48bb78;color:white;padding:20px 40px;border-radius:50px;font-size:18px;font-weight:bold;z-index:1000000;box-shadow:0 10px 30px rgba(0,0,0,0.3);">✅ Dados copiados! Cole no Painel Admin</div>';
    document.body.appendChild(msg);
    
    // Remover após 3 segundos
    setTimeout(() => {
        document.body.removeChild(textarea);
        document.body.removeChild(overlay);
        document.body.removeChild(msg);
    }, 3000);
})();
