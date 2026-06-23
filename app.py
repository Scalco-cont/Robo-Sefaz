from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import threading
import os
import json
import uuid
from main import processar_lote_guias

app = Flask(__name__)
CORS(app)

# Dicionário para armazenar o status das tarefas de emissão
# Cada tarefa tem seu próprio status independente
task_statuses = {}
task_locks = {}  # Locks individuais por tarefa

PERIODOS_FILE = 'periodos.json'


def load_periodos():
    if os.path.exists(PERIODOS_FILE):
        with open(PERIODOS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_periodos(periodos_data):
    with open(PERIODOS_FILE, 'w', encoding='utf-8') as f:
        json.dump(periodos_data, f, indent=4, ensure_ascii=False)


def resolver_caminho_rede(caminho_windows):
    """Converte caminho do Windows para o atalho do Linux no Coolify"""
    if not caminho_windows:
        return caminho_windows
    # Verifica se esta no Linux (producao)
    if os.name != 'nt':
        # Se for um caminho de rede Windows \\sv-scalco\...
        if caminho_windows.startswith(r'\\') or caminho_windows.startswith('//'):
            # Remove a dupla barra inicial
            partes = caminho_windows[2:].replace('\\', '/').split('/', 1)
            if len(partes) > 1:
                servidor, resto_caminho = partes
                # Mapeia para o root directory montado no Linux
                return f"/{servidor}/{resto_caminho}"
        # Caso seja letra de drive
        elif ':' in caminho_windows:
             return caminho_windows.split(':', 1)[1].replace('\\', '/')
    return caminho_windows


def processar_tarefa_emissao(task_id, task_data):
    """
    Processa uma tarefa de emissão em thread separada
    Cada usuário/requisição roda em sua própria thread
    """
    try:
        task_statuses[task_id] = {
            'status': 'processing', 
            'message': 'Iniciando processamento...',
            'progresso': {'atual': 0, 'total': len(task_data['notas'])}
        }
        
        print(f"\n[TASK {task_id[:8]}] Iniciando processamento de {len(task_data['notas'])} guia(s)")
        
        # Extrai dados da tarefa
        inscricaoEstadual = task_data['inscricaoEstadual']
        nomeGuia = task_data['nomeGuia']
        # Converte o caminho para o formato Linux para funcionar no Coolify
        caminhoDestino = resolver_caminho_rede(task_data['caminhoDestino'])
        notas = task_data['notas']
        
        # Prepara lista de notas formatadas
        notas_formatadas = []
        for nota in notas:
            nota_formatada = {
                'inscricaoEstadual': inscricaoEstadual,
                'referencia': nota['referencia'],
                'codigo': nota['codigo'],
                'chave': nota['chave'],
                'dataPagamento': formatar_data_para_br(nota['dataPagamento']),
                'vlr_tributo': formatar_numero_br(nota['diferencial']),
                'vlr_correcao': formatar_numero_br(nota['correcao']),
                'atraso': str(nota['diasAtraso']),
                'juros_nota': formatar_numero_br(nota['juros']),
                'nome': nomeGuia,
                'nfe': nota['nfe'],
                'caminhoDestino': caminhoDestino
            }
            notas_formatadas.append(nota_formatada)
        
        # Callback para atualizar progresso
        def callback_progresso(atual, total, status):
            task_statuses[task_id] = {
                'status': 'processing',
                'message': f'Processando guia {atual} de {total}...',
                'progresso': {'atual': atual, 'total': total}
            }
        
        # Processa todas as guias em uma única sessão do navegador
        resultados = processar_lote_guias(
            inscricaoEstadual=inscricaoEstadual,
            notas_list=notas_formatadas,
            caminhoDestino=caminhoDestino,
            callback_progresso=callback_progresso
        )
        
        # Atualiza status final
        if resultados['falhas'] == 0:
            task_statuses[task_id] = {
                'status': 'completed',
                'message': f"Todas as {resultados['sucesso']} guia(s) foram emitidas com sucesso!",
                'resultados': resultados
            }
            print(f"[TASK {task_id[:8]}] ✓ Concluído com sucesso")
        else:
            task_statuses[task_id] = {
                'status': 'completed_with_errors',
                'message': f"Processamento concluído: {resultados['sucesso']} sucesso(s), {resultados['falhas']} falha(s)",
                'resultados': resultados
            }
            print(f"[TASK {task_id[:8]}] ⚠ Concluído com erros")
    
    except FileNotFoundError as e:
        # Erro específico de caminho não encontrado
        task_statuses[task_id] = {
            'status': 'failed',
            'message': f'Caminho de destino não encontrado: {str(e)}',
            'progresso': {'atual': 0, 'total': len(task_data.get('notas', []))}
        }
        print(f"[TASK {task_id[:8]}] ✗ Erro: Caminho não encontrado - {e}")
    except Exception as e:
        task_statuses[task_id] = {
            'status': 'failed',
            'message': f'Erro na emissão: {str(e)}',
            'progresso': {'atual': 0, 'total': len(task_data.get('notas', []))}
        }
        print(f"[TASK {task_id[:8]}] ✗ Erro: {e}")


def formatar_numero_br(numero):
    """Converte número para formato brasileiro (vírgula) com 2 casas decimais"""
    # Garante que sempre terá 2 casas decimais
    valor_formatado = f"{float(numero):.2f}"
    return valor_formatado.replace('.', ',')


def formatar_data_para_br(data_iso):
    """Converte data ISO (YYYY-MM-DD) para formato BR (DD/MM/YYYY)"""
    if data_iso and '-' in data_iso:
        partes = data_iso.split('-')
        return f"{partes[2]}/{partes[1]}/{partes[0]}"
    return data_iso


@app.route('/')
def index():
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    return send_from_directory(static_dir, 'index.html')


@app.route('/index.js')
def serve_js():
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    return send_from_directory(static_dir, 'index.js')


@app.route('/api/emitir-guia', methods=['POST'])
def emitir_guia_api():
    """
    Recebe requisição de emissão e inicia processamento em thread separada
    Cada requisição é independente e pode rodar em paralelo
    """
    try:
        data = request.json
        
        # Validações básicas
        if not data.get('notas') or len(data['notas']) == 0:
            return jsonify({
                'sucesso': False,
                'erro': 'Nenhuma nota fornecida'
            }), 400
        
        # Gera ID único para esta tarefa
        task_id = str(uuid.uuid4())
        
        # Inicializa status
        task_statuses[task_id] = {
            'status': 'queued',
            'message': 'Tarefa adicionada à fila',
            'progresso': {'atual': 0, 'total': len(data['notas'])}
        }
        
        # Inicia processamento em thread separada (não bloqueia outros usuários)
        thread = threading.Thread(
            target=processar_tarefa_emissao,
            args=(task_id, data),
            daemon=True
        )
        thread.start()
        
        print(f"\n[API] Nova tarefa criada: {task_id[:8]} ({len(data['notas'])} guia(s))")
        
        return jsonify({
            'sucesso': True,
            'mensagem': 'Tarefa de emissão iniciada',
            'task_id': task_id
        })
    
    except Exception as e:
        print(f"[API] Erro ao criar tarefa: {e}")
        return jsonify({
            'sucesso': False,
            'erro': str(e)
        }), 500


@app.route('/api/task-status/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """Retorna o status de uma tarefa específica"""
    status = task_statuses.get(task_id, {
        'status': 'not_found',
        'message': 'Tarefa não encontrada',
        'progresso': {'atual': 0, 'total': 0}
    })
    return jsonify(status)


@app.route('/api/periodos', methods=['GET'])
def get_periodos():
    periodos_data = load_periodos()
    return jsonify(periodos_data)


@app.route('/api/periodos', methods=['POST'])
def update_periodos():
    data = request.json
    save_periodos(data['periodos'])
    return jsonify({'sucesso': True, 'mensagem': 'Períodos atualizados com sucesso.'})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Endpoint para monitoramento (opcional)"""
    stats = {
        'tarefas_ativas': len([t for t in task_statuses.values() if t['status'] in ['queued', 'processing']]),
        'tarefas_concluidas': len([t for t in task_statuses.values() if t['status'] in ['completed', 'completed_with_errors']]),
        'tarefas_falhadas': len([t for t in task_statuses.values() if t['status'] == 'failed']),
        'total_tarefas': len(task_statuses)
    }
    return jsonify(stats)


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 SERVIDOR DE EMISSÃO DE GUIAS")
    print("="*60)
    print("📌 Multi-usuário: Suporta múltiplos clientes simultâneos")
    print("📌 Otimizado: Reutiliza navegador para múltiplas guias")
    print("📌 Porta: 3939")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=3939, threaded=True)