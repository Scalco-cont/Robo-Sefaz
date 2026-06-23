function parseNumberBR(str) {
    if (str === null || str === undefined) return 0;
    str = String(str).trim();
    str = str.replace(/\./g, '').replace(/,/g, '.');
    const n = parseFloat(str);
    return isNaN(n) ? 0 : n;
}

function formatBR(n) {
    return (n ?? 0).toFixed(2).replace('.', ',');
}

function formatPercent(n) {
    return (n ?? 0).toFixed(2).replace('.', ',') + '%';
}

function parseDateBR(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
    }
    return null;
}

function dateToISO(dateStr) {
    const d = parseDateBR(dateStr);
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function daysBetween(dateA, dateB) {
    if (!dateA || !dateB) return 0;
    const a = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
    const b = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
    const diff = Math.floor((a - b) / (1000 * 60 * 60 * 24)) + 1;
    return diff < 0 ? 0 : diff;
}

/* ---------- DOM REFS ---------- */
const pasteArea = document.getElementById('pasteArea');
const importPastedBtn = document.getElementById('importPastedBtn');
const clearImportedBtn = document.getElementById('clearImportedBtn');
const notasBody = document.getElementById('notasBody');
const addRowBtn = document.getElementById('addRowBtn');
const clearTableBtn = document.getElementById('clearTableBtn');
const emitirGuiaBtn = document.getElementById('emitirGuiaBtn');
const periodosBody = document.getElementById('periodosBody');
const addPeriodoBtn = document.getElementById('addPeriodoBtn');
const inscricaoEstadual = document.getElementById('inscricaoEstadual');
const nomeGuia = document.getElementById('nomeGuia');
const caminhoDestino = document.getElementById('caminhoDestino');

// Elementos para feedback de carregamento e erros
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loadingOverlay';
loadingOverlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); display: none; justify-content: center; align-items: center; z-index: 1000;';
loadingOverlay.innerHTML = `
    <div style="background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; margin: auto;">
        <div style="margin-bottom: 20px; display: flex; justify-content: center;">
            <svg style="width: 80px; height: 80px; animation: spin 1s linear infinite; margin: 0 auto;" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="#3b82f6" stroke-width="4" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
            </svg>
        </div>
        <h3 style="font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 12px;">Processando Guias</h3>
        <p id="loadingMessage" style="font-size: 16px; color: #64748b; margin-bottom: 8px;">Iniciando emissão...</p>
        <p id="loadingDetail" style="font-size: 14px; color: #94a3b8; font-family: monospace;"></p>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </div>
`;
document.body.appendChild(loadingOverlay);

const errorDisplay = document.createElement('div');
errorDisplay.id = 'errorDisplay';
errorDisplay.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #fee2e2; color: #991b1b; border: 2px solid #fca5a5; padding: 16px 20px; border-radius: 12px; z-index: 1001; display: none; min-width: 300px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);';
document.body.appendChild(errorDisplay);

function showLoading(message = 'Carregando...', detail = '') {
    loadingOverlay.style.display = 'flex';
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingDetail').textContent = detail;
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function updateLoadingMessage(message, detail = '') {
    document.getElementById('loadingMessage').textContent = message;
    document.getElementById('loadingDetail').textContent = detail;
}

function showError(message) {
    errorDisplay.innerHTML = `<strong style="display: block; margin-bottom: 8px;">⚠️ Erro</strong>${message}`;
    errorDisplay.style.display = 'block';
    setTimeout(() => {
        errorDisplay.style.display = 'none';
    }, 7000);
}

/* ---------- DADOS INICIAIS DE PERÍODOS ---------- */
const defaultPeriodos = [
    { periodo: '01/2023', ultimoDia: '31/01/2023', cm: '1.0359', juros: '6' },
    { periodo: '02/2023', ultimoDia: '28/02/2023', cm: '1.0295', juros: '5' },
    { periodo: '03/2023', ultimoDia: '31/03/2023', cm: '1.0241', juros: '4' },
    { periodo: '04/2023', ultimoDia: '30/04/2023', cm: '1.0156', juros: '3' },
    { periodo: '05/2023', ultimoDia: '31/05/2023', cm: '1.0084', juros: '2' },
    { periodo: '06/2023', ultimoDia: '30/06/2023', cm: '1.0023', juros: '1' },
    { periodo: '07/2023', ultimoDia: '31/07/2023', cm: '1.0000', juros: '0' },
];

let periodos = [];
/* ---------- FUNÇÕES PARA O MODO NOTURNO ---------- */
function toggleDarkMode() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    html.classList.toggle('dark');
    
    if (html.classList.contains('dark')) {
        themeIcon.innerText = '☀️';
        themeText.innerText = 'Modo Claro';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.innerText = '🌙';
        themeText.innerText = 'Modo Noturno';
        localStorage.setItem('theme', 'light');
    }
}

window.onload = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('themeIcon').innerText = '☀️';
        document.getElementById('themeText').innerText = 'Modo Claro';
    }
};

/* ---------- FUNÇÕES PARA TABELA DE PERÍODOS ---------- */
async function loadPeriodosFromBackend() {
    try {
        const response = await fetch('/api/periodos');
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const data = await response.json();
        if (data.length > 0) {
            periodos = data;
        } else {
            periodos = JSON.parse(JSON.stringify(defaultPeriodos));
            await savePeriodosToBackend();
        }
        renderPeriodos();
    } catch (error) {
        console.error('Erro ao carregar períodos do backend:', error);
        showError('Erro ao carregar tabela de juros. Usando valores padrão.');
        periodos = JSON.parse(JSON.stringify(defaultPeriodos));
        renderPeriodos();
    }
}

async function savePeriodosToBackend() {
    try {
        const response = await fetch('/api/periodos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ periodos: periodos })
        });
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        console.log('Períodos salvos com sucesso no backend.');
    } catch (error) {
        console.error('Erro ao salvar períodos no backend:', error);
        showError('Erro ao salvar tabela de juros.');
    }
}

function renderPeriodos() {
    periodosBody.innerHTML = '';
    periodos.forEach((p, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-2 border"><input class="periodo w-full p-1 text-sm border rounded" value="${p.periodo}" /></td>
            <td class="p-2 border"><input class="ultimoDia w-full p-1 text-sm border rounded" value="${p.ultimoDia}" /></td>
            <td class="p-2 border"><input class="cm w-full p-1 text-sm border rounded" value="${p.cm}" /></td>
            <td class="p-2 border"><input class="juros w-full p-1 text-sm border rounded" value="${p.juros}" /></td>
            <td class="p-2 border"><button class="removePeriodo px-2 py-1 text-sm rounded bg-red-50 text-red-600 hover:bg-red-100">Remover</button></td>
        `;
        periodosBody.appendChild(tr);

        tr.querySelector('.removePeriodo').addEventListener('click', async () => {
            periodos.splice(idx, 1);
            renderPeriodos();
            recalcAll();
            await savePeriodosToBackend();
        });

        ['periodo', 'ultimoDia', 'cm', 'juros'].forEach(cls => {
            tr.querySelector('.' + cls).addEventListener('input', async (e) => {
                const val = e.target.value;
                // Preserva o valor como string para manter a precisão
                periodos[idx][cls] = val;
                recalcAll();
                await savePeriodosToBackend();
            });
        });
    });
}

addPeriodoBtn.addEventListener('click', async () => {
    periodos.push({ periodo: 'MM/AAAA', ultimoDia: '', cm: '0', juros: '0' });
    renderPeriodos();
    await savePeriodosToBackend();
});
/* ---------- FUNÇÕES PARA TABELA DE NOTAS ---------- */

function findPeriodoByRef(mmAaaa) {
    if (!mmAaaa) return null;
    for (const p of periodos) {
        if (String(p.periodo) === mmAaaa) return p;
        const partsP = String(p.periodo).split('/');
        if (partsP.length === 2) {
            const mm = partsP[0].padStart(2, '0');
            const ano = partsP[1];
            if (`${mm}/${ano}` === mmAaaa) return p;
        }
    }
    return null;
}

function createNotaRow(data = {}) {
    const tr = document.createElement('tr');

    const diferencialFormatted = (data.diferencial !== undefined && data.diferencial !== null)
        ? formatBR(data.diferencial)
        : '';

    tr.innerHTML = `
        <td class="p-2 border">
            <select class="codigo p-1 text-sm w-full border rounded">
                <option value="1317" ${data.codigo === '1317' || !data.codigo ? 'selected' : ''}>1317</option>
                <option value="2817" ${data.codigo === '2817' ? 'selected' : ''}>2817</option>
            </select>
        </td>
        <td class="p-2 border"><input class="chave w-full p-1 text-sm border rounded font-mono" value="${data.chave || ''}" placeholder="Chave de 44 dígitos" maxlength="44" /></td>
        <td class="p-2 border"><input class="nfe w-full p-1 text-sm border rounded" value="${data.nfe || ''}" /></td>
        <td class="p-2 border"><input class="emissao w-full p-1 text-sm border rounded" value="${data.dataEmissao || ''}" placeholder="DD/MM/AAAA" /></td>
        <td class="p-2 border"><input class="diferencial w-full p-1 text-sm border rounded" value="${diferencialFormatted}" /></td>
        <td class="p-2 border">
            <select class="calcAtraso p-1 text-sm w-full border rounded">
                <option value="sim">Sim</option>
                <option value="nao" ${data.calcAtraso === 'nao' ? 'selected' : ''}>Não</option>
            </select>
        </td>
        <td class="p-2 border"><input class="ref w-full p-1 text-sm border rounded text-center" value="${data.referencia || ''}" placeholder="MM/AAAA" /></td>
        <td class="p-2 border"><input type="date" class="pagamento w-full p-1 text-sm border rounded" /></td>
        <td class="p-2 border correcao text-sm text-right bg-blue-50"></td>
        <td class="p-2 border atraso text-sm text-center bg-yellow-50"></td>
        <td class="p-2 border jurosVal text-sm text-right bg-green-50"></td>
        <td class="p-2 border"><button class="removeNota px-2 py-1 rounded bg-red-50 text-red-600 text-sm hover:bg-red-100">Remover</button></td>
    `;

    if (data.dataEmissao) {
        const iso = dateToISO(data.dataEmissao);
        if (iso) tr.querySelector('.emissao').value = data.dataEmissao;
    }

    tr.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => calcRow(tr));
        el.addEventListener('change', () => calcRow(tr));
    });

    tr.querySelector('.removeNota').addEventListener('click', () => tr.remove());

    notasBody.appendChild(tr);
    calcRow(tr);
    return tr;
}

function calcRow(tr) {
    const chave = tr.querySelector('.chave').value.trim();
    const nfe = tr.querySelector('.nfe').value.trim();
    const emissaoVal = tr.querySelector('.emissao').value.trim();
    const diferencialStr = tr.querySelector('.diferencial').value;
    const calcAtrasoVal = tr.querySelector('.calcAtraso').value;
    const pagamentoVal = tr.querySelector('.pagamento').value;

    const diferencial = parseNumberBR(diferencialStr);

    let referencia = '';
    let emissaoDate = null;
    if (emissaoVal) {
        if (emissaoVal.includes('/')) {
            emissaoDate = parseDateBR(emissaoVal);
        } else if (emissaoVal.includes('-')) {
            emissaoDate = new Date(emissaoVal);
        }

        if (emissaoDate) {
            const mm = String(emissaoDate.getMonth() + 1).padStart(2, '0');
            const yyyy = emissaoDate.getFullYear();
            referencia = `${mm}/${yyyy}`;
        }
    }
    const refInput = tr.querySelector('.ref');
    if (referencia && !refInput.value) {
        refInput.value = referencia;
    }
    const currentRef = refInput.value;

    const periodo = findPeriodoByRef(currentRef);
    const cm = periodo ? parseFloat(periodo.cm) || 0 : 0;
    const jurosPercent = periodo ? parseFloat(periodo.juros) || 0 : 0;

    tr.setAttribute('data-tx-cor', cm > 0 ? cm.toFixed(4) : '0');
    tr.setAttribute('data-tx-jur', formatPercent(jurosPercent));

    if (calcAtrasoVal === 'nao') {
        tr.querySelector('.correcao').textContent = '0,00';
        tr.querySelector('.atraso').textContent = '0';
        tr.querySelector('.jurosVal').textContent = '0,00';
        return;
    }

    let correcao = 0;
    if (cm > 0 && Math.abs(cm - 1) > 0.0001) {
        correcao = diferencial * (cm - 1);
    }
    if (Math.abs(correcao) < 0.01) correcao = 0;

    let dias = 0;
    if (emissaoDate && pagamentoVal) {
        const pagamentoDate = new Date(pagamentoVal);
        dias = daysBetween(pagamentoDate, emissaoDate);
    }

    let juros = 0;
    if (jurosPercent > 0) {
        juros = (diferencial + correcao) * (jurosPercent / 100);
    }

    tr.querySelector('.correcao').textContent = formatBR(correcao);
    tr.querySelector('.atraso').textContent = String(dias);
    tr.querySelector('.jurosVal').textContent = formatBR(juros);
}

function recalcAll() {
    notasBody.querySelectorAll('tr').forEach(tr => calcRow(tr));
}

/* ---------- PARSING DO TEXTO COLADO ---------- */

function importPastedText(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
        // Primeiro tenta split por TAB, depois por múltiplos espaços
        let tokens = line.split('\t');

        // Remove tokens vazios e trim em cada um
        tokens = tokens.map(t => t.trim()).filter(t => t !== '');

        // Se ainda não tiver tokens suficientes, tenta split por espaços
        if (tokens.length < 3) {
            tokens = line.split(/\s+/).map(t => t.trim()).filter(t => t !== '');
        }

        console.log('Linha original:', line);
        console.log('Total de tokens:', tokens.length);
        console.log('Tokens:', tokens);

        if (tokens.length >= 3) {
            // Índices fixos conforme especificado
            const chave = tokens[0] || '';
            const nfe = tokens[1] || '';
            const dataEmissao = tokens[2] || '';

            // Índice 4 = ICMS ST (quinta posição)
            const icmsST = tokens[4] ? parseNumberBR(tokens[4]) : 0;

            // Índice 8 = DIFAL (nona posição)
            const difal = tokens[8] ? parseNumberBR(tokens[8]) : 0;

            // Pega o MAIOR valor entre ICMS ST (índice 4) e DIFAL (índice 8)
            const diferencial = Math.max(icmsST, difal);

            // Define o código baseado em qual índice tem o valor
            let codigo = '1317'; // Padrão
            if (icmsST > difal) {
                codigo = '2817'; // ICMS ST (índice 4) → código 2817
            } else if (difal > icmsST) {
                codigo = '1317'; // DIFAL (índice 8) → código 1317
            }

            console.log('Valores extraídos:', {
                chave: chave.substring(0, 20) + '...',
                nfe,
                dataEmissao,
                'ICMS ST (índice 4)': icmsST,
                'DIFAL (índice 8)': difal,
                diferencialEscolhido: diferencial,
                codigoDefinido: codigo
            });

            createNotaRow({
                chave,
                nfe,
                dataEmissao,
                diferencial: diferencial,
                codigo: codigo,
                calcAtraso: 'sim'
            });
        } else {
            console.warn('Linha com tokens insuficientes (precisa >= 3):', tokens.length);
        }
    }
    recalcAll();
}

/* ---------- EVENTOS ---------- */

importPastedBtn.addEventListener('click', () => {
    const txt = pasteArea.value.trim();
    if (!txt) {
        alert('Cole os dados antes de importar.');
        return;
    }
    importPastedText(txt);
    pasteArea.value = '';
});

clearImportedBtn.addEventListener('click', () => pasteArea.value = '');

addRowBtn.addEventListener('click', () => createNotaRow({}));

clearTableBtn.addEventListener('click', () => {
    if (!confirm('Limpar todas as linhas da tabela?')) return;
    notasBody.innerHTML = '';
});

emitirGuiaBtn.addEventListener('click', async () => {
    showLoading('Validando dados...', 'Verificando campos obrigatórios');
    const ie = inscricaoEstadual.value.trim();
    const nome = nomeGuia.value.trim();
    const caminho = caminhoDestino.value.trim();

    if (!ie) {
        hideLoading();
        showError('Por favor, preencha a Inscrição Estadual.');
        inscricaoEstadual.focus();
        return;
    }

    if (!nome) {
        hideLoading();
        showError('Por favor, preencha o Nome da Guia.');
        nomeGuia.focus();
        return;
    }

    if (!caminho) {
        hideLoading();
        showError('Por favor, preencha o Caminho de Destino.');
        caminhoDestino.focus();
        return;
    }

    const notas = [];
    notasBody.querySelectorAll('tr').forEach(tr => {
        const codigo = tr.querySelector('.codigo').value;
        const chave = tr.querySelector('.chave').value.trim();
        const nfe = tr.querySelector('.nfe').value.trim();
        const emissao = tr.querySelector('.emissao').value.trim();
        const dif = parseNumberBR(tr.querySelector('.diferencial').value);
        const ref = tr.querySelector('.ref').value.trim();
        const calcA = tr.querySelector('.calcAtraso').value;
        const pag = tr.querySelector('.pagamento').value;
        const correcao = parseNumberBR(tr.querySelector('.correcao').textContent);
        const atraso = parseInt(tr.querySelector('.atraso').textContent || '0', 10) || 0;
        const juros = parseNumberBR(tr.querySelector('.jurosVal').textContent);
        const txCor = tr.getAttribute('data-tx-cor') || '0';
        const txJur = tr.getAttribute('data-tx-jur') || '0%';

        notas.push({
            codigo, chave, nfe, emissao, diferencial: dif, referencia: ref,
            calcularAtraso: calcA, dataPagamento: pag,
            correcao, diasAtraso: atraso, juros,
            txCorrecao: txCor, txJuros: txJur,
            inscricaoEstadual: ie
        });
    });

    if (notas.length === 0) {
        hideLoading();
        showError('Adicione pelo menos uma nota antes de emitir a guia.');
        return;
    }

    updateLoadingMessage('Enviando para processamento...', `${notas.length} guia(s) na fila`);

    try {
        const response = await fetch('/api/emitir-guia', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                notas: notas,
                inscricaoEstadual: ie,
                nomeGuia: nome,
                caminhoDestino: caminho
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensagem || `Erro HTTP: ${response.status}`);
        }

        const resultado = await response.json();

        if (resultado.sucesso) {
            updateLoadingMessage('Tarefa adicionada à fila', `ID: ${resultado.task_id.substring(0, 8)}...`);
            console.log('Resposta do servidor:', resultado);
            pollTaskStatus(resultado.task_id, notas.length);
        } else {
            hideLoading();
            showError(`Erro ao emitir guia: ${resultado.erro || 'Erro desconhecido'}`);
        }
    } catch (error) {
        console.error('Erro ao emitir guia:', error);
        hideLoading();
        showError(`Erro ao conectar com o servidor: ${error.message}`);
    }
});

async function pollTaskStatus(taskId, totalGuias) {
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/api/task-status/${taskId}`);
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const statusData = await response.json();
            console.log(`Status da tarefa ${taskId}:`, statusData);

            const progresso = statusData.progresso || { atual: 0, total: totalGuias };

            if (statusData.status === 'completed') {
                clearInterval(interval);
                updateLoadingMessage(
                    '✅ Concluído!',
                    `${progresso.total} guia(s) emitida(s) com sucesso`
                );
                setTimeout(() => {
                    hideLoading();
                    alert(`✅ Emissão concluída!\n\n${progresso.total} guia(s) processada(s) com sucesso.`);
                }, 1500);
            } else if (statusData.status === 'completed_with_errors') {
                clearInterval(interval);
                const resultado = statusData.resultados || {};
                updateLoadingMessage(
                    '⚠️ Concluído com avisos',
                    `${resultado.sucesso || 0} sucesso(s), ${resultado.falhas || 0} falha(s)`
                );
                setTimeout(() => {
                    hideLoading();
                    alert(`⚠️ Processamento concluído com avisos:\n\n✓ ${resultado.sucesso || 0} guia(s) emitida(s)\n✗ ${resultado.falhas || 0} falha(s)\n\nVerifique o console do servidor para detalhes.`);
                }, 2000);
            } else if (statusData.status === 'failed') {
                clearInterval(interval);
                hideLoading();
                showError(`Emissão falhou: ${statusData.message}`);
            } else if (statusData.status === 'processing') {
                updateLoadingMessage(
                    `Processando guia ${progresso.atual} de ${progresso.total}...`,
                    statusData.message || 'Preenchendo formulário...'
                );
            } else {
                updateLoadingMessage(
                    'Aguardando processamento...',
                    statusData.message || 'Na fila'
                );
            }
        } catch (error) {
            clearInterval(interval);
            console.error(`Erro ao verificar status da tarefa ${taskId}:`, error);
            hideLoading();
            showError(`Erro ao verificar status: ${error.message}`);
        }
    }, 2000); // Verifica a cada 2 segundos (mais responsivo)
}

/* ---------- INICIALIZAÇÃO ---------- */
async function init() {
    await loadPeriodosFromBackend();
    recalcAll();
}
init();