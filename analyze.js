(function () {
    'use strict';

    // API URL - ajuste conforme necessário
    const API_BASE_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:7860'
        : 'https://jade-proxy.onrender.com';

    // DOM Elements
    const uploadZone = document.getElementById('upload-zone');
    const csvInput = document.getElementById('csv-input');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file-btn');
    const userPrompt = document.getElementById('user-prompt');
    const targetCol = document.getElementById('target-col');
    const modelType = document.getElementById('model-type');
    const edaBtn = document.getElementById('eda-btn');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsSection = document.getElementById('results-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const edaResults = document.getElementById('eda-results');
    const trainingResults = document.getElementById('training-results');
    const errorDisplay = document.getElementById('error-display');
    const errorMessage = document.getElementById('error-message');

    // State
    let csvData = null;
    let csvColumns = [];

    // Upload Zone Events
    uploadZone.addEventListener('click', () => csvInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            handleFile(file);
        }
    });

    csvInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    removeFileBtn.addEventListener('click', () => {
        csvData = null;
        csvColumns = [];
        fileInfo.classList.add('hidden');
        uploadZone.classList.remove('hidden');
        targetCol.innerHTML = '<option value="">Auto-detectar</option>';
    });

    // Handle CSV File
    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            csvData = e.target.result;
            fileName.textContent = `📄 ${file.name}`;
            fileInfo.classList.remove('hidden');
            uploadZone.classList.add('hidden');

            // Detectar separador (vírgula ou ponto e vírgula)
            const firstLine = csvData.split('\n')[0];
            const separator = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
            csvColumns = firstLine.split(separator).map(col => col.trim().replace(/"/g, ''));

            // Populate target column dropdown
            targetCol.innerHTML = '<option value="">Auto-detectar</option>';
            csvColumns.forEach(col => {
                const option = document.createElement('option');
                option.value = col;
                option.textContent = col;
                targetCol.appendChild(option);
            });
        };
        reader.readAsText(file);
    }

    // EDA Button
    edaBtn.addEventListener('click', () => runAnalysis(true));

    // Analyze Button
    analyzeBtn.addEventListener('click', () => runAnalysis(false));

    // Run Analysis
    async function runAnalysis(onlyEda = false) {
        if (!csvData) {
            showError('Por favor, faça upload de um arquivo CSV primeiro.');
            return;
        }

        // Show results section and loading
        resultsSection.classList.remove('hidden');
        loadingIndicator.classList.remove('hidden');
        edaResults.classList.add('hidden');
        trainingResults.classList.add('hidden');
        errorDisplay.classList.add('hidden');

        // Disable buttons
        edaBtn.disabled = true;
        analyzeBtn.disabled = true;

        try {
            const endpoint = onlyEda ? '/analyze/eda' : '/analyze';
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    csv_data: csvData,
                    user_prompt: userPrompt.value,
                    target_col: targetCol.value || null,
                    model_type: modelType.value,
                    only_eda: onlyEda
                })
            });

            const result = await response.json();
            loadingIndicator.classList.add('hidden');

            console.log('API Response:', result);  // Debug

            if (result.success) {
                if (result.eda) {
                    displayEDA(result.eda);
                }
                if (result.training && result.training.success) {
                    displayTraining(result.training);
                } else if (result.training && result.training.error) {
                    showError(`Erro no treino: ${result.training.error}`);
                }
            } else {
                showError(result.error || result.detail || JSON.stringify(result));
            }

        } catch (err) {
            loadingIndicator.classList.add('hidden');
            console.error('Fetch error:', err);  // Debug
            showError(`Erro de conexão: ${err.message}`);
        } finally {
            edaBtn.disabled = false;
            analyzeBtn.disabled = false;
        }
    }

    // Display EDA Results
    function displayEDA(eda) {
        edaResults.classList.remove('hidden');
        const statsGrid = document.getElementById('eda-stats');

        statsGrid.innerHTML = `
            <div class="stat-item">
                <div class="value">${eda.rows?.toLocaleString() || 0}</div>
                <div class="label">Linhas</div>
            </div>
            <div class="stat-item">
                <div class="value">${eda.columns || 0}</div>
                <div class="label">Colunas</div>
            </div>
            <div class="stat-item">
                <div class="value">${Object.values(eda.missing_values || {}).reduce((a, b) => a + b, 0)}</div>
                <div class="label">Valores Faltando</div>
            </div>
            <div class="stat-item">
                <div class="value">${Object.keys(eda.numeric_stats || {}).length}</div>
                <div class="label">Cols. Numéricas</div>
            </div>
        `;
    }

    // Display Training Results
    function displayTraining(training) {
        trainingResults.classList.remove('hidden');
        const metricsGrid = document.getElementById('metrics-grid');
        const featureImportance = document.getElementById('feature-importance');

        // Metrics
        const metrics = training.metrics || {};
        let metricsHtml = '';

        for (const [key, value] of Object.entries(metrics)) {
            const formattedValue = typeof value === 'number'
                ? (value < 1 ? (value * 100).toFixed(1) + '%' : value.toFixed(3))
                : value;

            metricsHtml += `
                <div class="metric-item">
                    <div class="value">${formattedValue}</div>
                    <div class="label">${key.replace('_', ' ')}</div>
                </div>
            `;
        }
        metricsGrid.innerHTML = metricsHtml;

        // Feature Importance
        const importance = training.feature_importance || {};
        const maxImportance = Math.max(...Object.values(importance), 0.01);

        let importanceHtml = '';
        const sortedFeatures = Object.entries(importance)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10); // Top 10

        for (const [feature, value] of sortedFeatures) {
            const percentage = (value / maxImportance) * 100;
            importanceHtml += `
                <div class="feature-bar">
                    <span class="name">${feature}</span>
                    <div class="bar-container">
                        <div class="bar" style="width: ${percentage}%"></div>
                    </div>
                    <span class="value">${value.toFixed(3)}</span>
                </div>
            `;
        }
        featureImportance.innerHTML = importanceHtml || '<p style="color: var(--text-secondary)">Feature importance não disponível para este modelo.</p>';

        // Show download button and store model data
        const downloadBtn = document.getElementById('download-model-btn');
        if (training.model_base64) {
            downloadBtn.classList.remove('hidden');
            downloadBtn.onclick = () => downloadModel(training.model_base64, training.model_type);
        }
    }

    // Download Model
    function downloadModel(base64Data, modelType) {
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `modelo_${modelType}_${Date.now()}.joblib`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Show Error
    function showError(message) {
        resultsSection.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
        errorDisplay.classList.remove('hidden');
        errorMessage.textContent = message;
    }

})();
