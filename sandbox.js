/**
 * J.A.D.E. Sandbox - Code Execution Frontend
 * Execute Python code in E2B cloud sandbox
 */

(function () {
    'use strict';

    // API Configuration
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:7860'
        : 'https://madras1-jade-port.hf.space';
    const SANDBOX_URL = `${API_BASE}/sandbox/execute`;
    const STATUS_URL = `${API_BASE}/sandbox/status`;

    // DOM Elements
    const codeEditor = document.getElementById('code-editor');
    const lineNumbers = document.getElementById('line-numbers');
    const runBtn = document.getElementById('run-btn');
    const clearBtn = document.getElementById('clear-btn');
    const exampleBtn = document.getElementById('example-btn');
    const outputContainer = document.getElementById('output-container');
    const statusBadge = document.getElementById('status-badge');
    const executionTime = document.getElementById('execution-time');
    const copyOutputBtn = document.getElementById('copy-output-btn');
    const clearOutputBtn = document.getElementById('clear-output-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const examplesModal = document.getElementById('examples-modal');
    const modalClose = document.getElementById('modal-close');

    // State
    let isRunning = false;

    // Code Examples
    const codeExamples = {
        hello: `# Hello World
print("Hello, J.A.D.E.! 🤖")
print("Bem-vindo ao Sandbox!")

nome = "Gabriel"
print(f"Olá, {nome}!")`,

        math: `# Operações Matemáticas
import math

# Básico
a, b = 10, 3
print(f"Soma: {a} + {b} = {a + b}")
print(f"Divisão: {a} / {b} = {a / b:.2f}")
print(f"Potência: {a} ** {b} = {a ** b}")

# Avançado
print(f"\\nRaiz de 144: {math.sqrt(144)}")
print(f"Pi: {math.pi:.6f}")
print(f"Seno(45°): {math.sin(math.radians(45)):.4f}")`,

        fibonacci: `# Sequência de Fibonacci
def fibonacci(n):
    """Gera os primeiros n números de Fibonacci."""
    fib = [0, 1]
    for i in range(2, n):
        fib.append(fib[i-1] + fib[i-2])
    return fib[:n]

# Gerar primeiros 15 números
resultado = fibonacci(15)
print("📐 Sequência de Fibonacci:")
print(resultado)

# Soma e média
print(f"\\nSoma: {sum(resultado)}")
print(f"Média: {sum(resultado)/len(resultado):.2f}")`,

        requests: `# HTTP Request
import requests

# Buscar dados de uma API pública
url = "https://api.github.com/repos/python/cpython"
response = requests.get(url)
data = response.json()

print("🐍 Python Repository Info:")
print(f"Nome: {data['name']}")
print(f"Stars: {data['stargazers_count']:,}")
print(f"Forks: {data['forks_count']:,}")
print(f"Linguagem: {data['language']}")`,

        pandas: `# Análise com Pandas
import pandas as pd

# Criar DataFrame
dados = {
    'Nome': ['Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo'],
    'Idade': [25, 30, 35, 28, 32],
    'Salário': [4500, 6200, 8100, 5500, 7000]
}

df = pd.DataFrame(dados)
print("📊 DataFrame:")
print(df)

print("\\n📈 Estatísticas:")
print(df.describe())

print(f"\\nMédia salarial: R$ {df['Salário'].mean():,.2f}")
print(f"Pessoa mais velha: {df.loc[df['Idade'].idxmax(), 'Nome']}")`,

        matplotlib: `# Gráfico com Matplotlib
import matplotlib.pyplot as plt
import numpy as np

# Dados
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

# Criar figura
plt.figure(figsize=(10, 6))
plt.plot(x, y1, label='sin(x)', color='#22d3ee', linewidth=2)
plt.plot(x, y2, label='cos(x)', color='#f472b6', linewidth=2)
plt.xlabel('x')
plt.ylabel('y')
plt.title('Funções Trigonométricas')
plt.legend()
plt.grid(True, alpha=0.3)

# Salvar (E2B retorna imagem)
plt.savefig('grafico.png', dpi=100, bbox_inches='tight')
print("✅ Gráfico gerado com sucesso!")
print("📈 Arquivo: grafico.png")`
    };

    // Initialize
    function init() {
        checkSandboxStatus();
        updateLineNumbers();
        setupEventListeners();
        loadTheme();
    }

    // Check if sandbox is available
    async function checkSandboxStatus() {
        try {
            const response = await fetch(STATUS_URL);
            const data = await response.json();

            if (data.available) {
                statusBadge.classList.add('online');
                statusBadge.classList.remove('offline');
                statusBadge.querySelector('.status-text').textContent = 'E2B Online';
            } else {
                statusBadge.classList.add('offline');
                statusBadge.classList.remove('online');
                statusBadge.querySelector('.status-text').textContent = 'Offline';
            }
        } catch (error) {
            console.error('Status check failed:', error);
            statusBadge.classList.add('offline');
            statusBadge.querySelector('.status-text').textContent = 'Desconectado';
        }
    }

    // Update line numbers
    function updateLineNumbers() {
        const lines = codeEditor.value.split('\n');
        lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
    }

    // Execute code
    async function executeCode() {
        if (isRunning) return;

        const code = codeEditor.value.trim();
        if (!code) {
            showOutput('⚠️ Digite algum código para executar.', 'error');
            return;
        }

        isRunning = true;
        document.body.classList.add('running');
        runBtn.disabled = true;
        runBtn.innerHTML = `<span>Executando...</span>`;
        executionTime.textContent = '';

        showOutput('🔄 Executando código no E2B sandbox...', 'loading');

        const startTime = Date.now();

        try {
            const response = await fetch(SANDBOX_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, timeout: 30 })
            });

            const data = await response.json();
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            executionTime.textContent = `${elapsed}s`;

            if (data.success) {
                let output = data.output || '(Sem output)';
                // Render text output and images
                showOutput(output, 'success', data.images || []);
            } else {
                showOutput(`❌ Erro:\n${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Execution failed:', error);
            showOutput(`❌ Falha na conexão: ${error.message}`, 'error');
        } finally {
            isRunning = false;
            document.body.classList.remove('running');
            runBtn.disabled = false;
            runBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>Executar</span>
                <span class="shortcut">Ctrl+Enter</span>
            `;
        }
    }

    // Show output with optional images
    function showOutput(content, type = 'success', images = []) {
        let html = `<div class="output-content ${type}">${escapeHtml(content)}</div>`;

        // Add images if present
        if (images && images.length > 0) {
            html += '<div class="output-images">';
            for (const img of images) {
                html += `<img src="data:image/png;base64,${img}" class="output-image" alt="Generated chart" />`;
            }
            html += '</div>';
        }

        outputContainer.innerHTML = html;
    }

    // Escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Clear output
    function clearOutput() {
        outputContainer.innerHTML = `
            <div class="output-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
                </svg>
                <p>Output aparecerá aqui</p>
                <span>Pressione Ctrl+Enter para executar</span>
            </div>
        `;
        executionTime.textContent = '';
    }

    // Copy output
    function copyOutput() {
        const content = outputContainer.querySelector('.output-content');
        if (content) {
            navigator.clipboard.writeText(content.textContent);
            copyOutputBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
            setTimeout(() => {
                copyOutputBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
            }, 1500);
        }
    }

    // Load example
    function loadExample(name) {
        if (codeExamples[name]) {
            codeEditor.value = codeExamples[name];
            updateLineNumbers();
            closeModal();
            clearOutput();
        }
    }

    // Modal controls
    function openModal() {
        examplesModal.classList.remove('hidden');
    }

    function closeModal() {
        examplesModal.classList.add('hidden');
    }

    // Theme toggle
    function toggleTheme() {
        const body = document.body;
        const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
        body.dataset.theme = newTheme;
        localStorage.setItem('sandbox-theme', newTheme);
    }

    function loadTheme() {
        const saved = localStorage.getItem('sandbox-theme');
        if (saved) {
            document.body.dataset.theme = saved;
        }
    }

    // Event Listeners
    function setupEventListeners() {
        // Code editor
        codeEditor.addEventListener('input', updateLineNumbers);
        codeEditor.addEventListener('scroll', () => {
            lineNumbers.scrollTop = codeEditor.scrollTop;
        });

        // Tab key support
        codeEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = codeEditor.selectionStart;
                const end = codeEditor.selectionEnd;
                codeEditor.value = codeEditor.value.substring(0, start) + '    ' + codeEditor.value.substring(end);
                codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
                updateLineNumbers();
            }

            // Ctrl+Enter to run
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                executeCode();
            }
        });

        // Buttons
        runBtn.addEventListener('click', executeCode);
        clearBtn.addEventListener('click', () => {
            codeEditor.value = '';
            updateLineNumbers();
        });
        exampleBtn.addEventListener('click', openModal);
        clearOutputBtn.addEventListener('click', clearOutput);
        copyOutputBtn.addEventListener('click', copyOutput);
        themeToggle.addEventListener('click', toggleTheme);

        // Modal
        modalClose.addEventListener('click', closeModal);
        examplesModal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

        // Example cards
        document.querySelectorAll('.example-card').forEach(card => {
            card.addEventListener('click', () => {
                loadExample(card.dataset.example);
            });
        });

        // Escape to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !examplesModal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    // Start
    init();
})();
