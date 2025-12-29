/**
 * Image Gen - JavaScript Controller
 * Handles image generation with Chutes.ai models
 */

// DOM Elements
const modelBtns = document.querySelectorAll('.model-btn');
const promptInput = document.getElementById('prompt-input');
const uploadGroup = document.getElementById('upload-group');
const uploadZone = document.getElementById('upload-zone');
const imageUpload = document.getElementById('image-upload');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const uploadPreview = document.getElementById('upload-preview');
const previewImage = document.getElementById('preview-image');
const removeImageBtn = document.getElementById('remove-image-btn');
const toggleAdvancedBtn = document.getElementById('toggle-advanced');
const advancedControls = document.getElementById('advanced-controls');
const negativePrompt = document.getElementById('negative-prompt');
const guidanceScale = document.getElementById('guidance-scale');
const guidanceValue = document.getElementById('guidance-value');
const widthSelect = document.getElementById('width');
const heightSelect = document.getElementById('height');
const seedInput = document.getElementById('seed');
const generateBtn = document.getElementById('generate-btn');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultLoading = document.getElementById('result-loading');
const resultImage = document.getElementById('result-image');
const resultError = document.getElementById('result-error');
const generatedImage = document.getElementById('generated-image');
const errorMessage = document.getElementById('error-message');
const downloadBtn = document.getElementById('download-btn');
const saveGalleryBtn = document.getElementById('save-gallery-btn');
const useAsInputBtn = document.getElementById('use-as-input-btn');
const galleryGrid = document.getElementById('gallery-grid');
const galleryEmpty = document.getElementById('gallery-empty');
const clearGalleryBtn = document.getElementById('clear-gallery-btn');

// State
let selectedModel = 'z-turbo';
let uploadedImageBase64 = null;
let currentGeneratedImage = null;
const GALLERY_KEY = 'jade_imagegen_gallery';
const MAX_GALLERY_ITEMS = 20;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initModelSelector();
    initUploadZone();
    initAdvancedControls();
    initGenerateButton();
    initResultActions();
    initGallery();
    initSidebar();
});

// Model Selector
function initModelSelector() {
    modelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            modelBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            selectedModel = btn.dataset.model;

            // Show/hide upload zone for edit mode
            if (selectedModel === 'qwen-edit') {
                uploadGroup.classList.remove('hidden');
            } else {
                uploadGroup.classList.add('hidden');
                clearUploadedImage();
            }
        });
    });
}

// Upload Zone
function initUploadZone() {
    // Click to upload
    uploadZone.addEventListener('click', (e) => {
        if (e.target !== removeImageBtn && !removeImageBtn.contains(e.target)) {
            imageUpload.click();
        }
    });

    // File selected
    imageUpload.addEventListener('change', handleFileSelect);

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Remove image
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearUploadedImage();
    });
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        showError('Por favor, selecione uma imagem válida');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImageBase64 = e.target.result;
        previewImage.src = uploadedImageBase64;
        uploadPlaceholder.classList.add('hidden');
        uploadPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function clearUploadedImage() {
    uploadedImageBase64 = null;
    imageUpload.value = '';
    previewImage.src = '';
    uploadPlaceholder.classList.remove('hidden');
    uploadPreview.classList.add('hidden');
}

// Advanced Controls
function initAdvancedControls() {
    toggleAdvancedBtn.addEventListener('click', () => {
        toggleAdvancedBtn.classList.toggle('open');
        advancedControls.classList.toggle('hidden');
    });

    guidanceScale.addEventListener('input', () => {
        guidanceValue.textContent = guidanceScale.value;
    });
}

// Generate Button
function initGenerateButton() {
    generateBtn.addEventListener('click', generateImage);
}

async function generateImage() {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showError('Por favor, digite um prompt');
        return;
    }

    if (selectedModel === 'qwen-edit' && !uploadedImageBase64) {
        showError('Por favor, faça upload de uma imagem para editar');
        return;
    }

    // Show loading
    showLoading();

    // Build request
    const request = {
        prompt: prompt,
        model: selectedModel,
        negative_prompt: negativePrompt.value || '',
        guidance_scale: parseFloat(guidanceScale.value),
        width: parseInt(widthSelect.value),
        height: parseInt(heightSelect.value)
    };

    if (selectedModel === 'qwen-edit' && uploadedImageBase64) {
        request.image_base64 = uploadedImageBase64;
    }

    const seed = seedInput.value.trim();
    if (seed) {
        request.seed = parseInt(seed);
    }

    try {
        const response = await fetch('/imagegen/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        const data = await response.json();

        if (data.success && data.image_base64) {
            // Show result
            currentGeneratedImage = {
                base64: data.image_base64,
                prompt: prompt,
                model: selectedModel,
                timestamp: Date.now()
            };

            const contentType = data.content_type || 'image/png';
            generatedImage.src = `data:${contentType};base64,${data.image_base64}`;
            showResult();
        } else {
            showError(data.error || 'Erro ao gerar imagem');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showError('Erro de conexão. Verifique o servidor.');
    }
}

// UI State Management
function showLoading() {
    resultPlaceholder.classList.add('hidden');
    resultImage.classList.add('hidden');
    resultError.classList.add('hidden');
    resultLoading.classList.remove('hidden');
    generateBtn.disabled = true;
}

function showResult() {
    resultPlaceholder.classList.add('hidden');
    resultLoading.classList.add('hidden');
    resultError.classList.add('hidden');
    resultImage.classList.remove('hidden');
    generateBtn.disabled = false;
}

function showError(message) {
    resultPlaceholder.classList.add('hidden');
    resultLoading.classList.add('hidden');
    resultImage.classList.add('hidden');
    resultError.classList.remove('hidden');
    errorMessage.textContent = message;
    generateBtn.disabled = false;
}

function resetResult() {
    resultLoading.classList.add('hidden');
    resultImage.classList.add('hidden');
    resultError.classList.add('hidden');
    resultPlaceholder.classList.remove('hidden');
}

// Result Actions
function initResultActions() {
    // Download
    downloadBtn.addEventListener('click', () => {
        if (!currentGeneratedImage) return;

        const link = document.createElement('a');
        link.href = `data:image/png;base64,${currentGeneratedImage.base64}`;
        link.download = `jade-imagegen-${Date.now()}.png`;
        link.click();
    });

    // Save to gallery
    saveGalleryBtn.addEventListener('click', () => {
        if (!currentGeneratedImage) return;
        saveToGallery(currentGeneratedImage);
    });

    // Use as input for editing
    useAsInputBtn.addEventListener('click', () => {
        if (!currentGeneratedImage) return;

        // Switch to edit mode
        modelBtns.forEach(b => b.classList.remove('active'));
        document.querySelector('[data-model="qwen-edit"]').classList.add('active');
        selectedModel = 'qwen-edit';
        uploadGroup.classList.remove('hidden');

        // Set as uploaded image
        uploadedImageBase64 = `data:image/png;base64,${currentGeneratedImage.base64}`;
        previewImage.src = uploadedImageBase64;
        uploadPlaceholder.classList.add('hidden');
        uploadPreview.classList.remove('hidden');

        // Clear prompt for edit instruction
        promptInput.value = '';
        promptInput.placeholder = 'Descreva a edição que você quer fazer...';
        promptInput.focus();
    });
}

// Gallery
function initGallery() {
    loadGallery();

    clearGalleryBtn.addEventListener('click', () => {
        if (confirm('Limpar todas as imagens da galeria?')) {
            localStorage.removeItem(GALLERY_KEY);
            loadGallery();
        }
    });
}

function loadGallery() {
    const gallery = getGallery();

    // Clear existing items (except empty placeholder)
    const items = galleryGrid.querySelectorAll('.gallery-item');
    items.forEach(item => item.remove());

    if (gallery.length === 0) {
        galleryEmpty.style.display = 'block';
        return;
    }

    galleryEmpty.style.display = 'none';

    // Add items in reverse order (newest first)
    gallery.slice().reverse().forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.innerHTML = `
            <img src="data:image/png;base64,${item.base64}" alt="${item.prompt}" title="${item.prompt}">
            <button class="delete-btn" data-index="${gallery.length - 1 - index}">×</button>
        `;

        // Click to view
        div.querySelector('img').addEventListener('click', () => {
            currentGeneratedImage = item;
            generatedImage.src = `data:image/png;base64,${item.base64}`;
            showResult();
        });

        // Delete
        div.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(e.target.dataset.index);
            removeFromGallery(idx);
        });

        galleryGrid.appendChild(div);
    });
}

function getGallery() {
    try {
        return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
    } catch {
        return [];
    }
}

function saveToGallery(imageData) {
    let gallery = getGallery();

    // Check for duplicates (same base64)
    const exists = gallery.some(item => item.base64 === imageData.base64);
    if (exists) {
        return;
    }

    // Add to gallery
    gallery.push(imageData);

    // Limit size
    if (gallery.length > MAX_GALLERY_ITEMS) {
        gallery = gallery.slice(-MAX_GALLERY_ITEMS);
    }

    localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    loadGallery();
}

function removeFromGallery(index) {
    const gallery = getGallery();
    gallery.splice(index, 1);
    localStorage.setItem(GALLERY_KEY, JSON.stringify(gallery));
    loadGallery();
}

// Sidebar
function initSidebar() {
    const toggleBtn = document.getElementById('toggle-sidebar-btn');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');

    function toggleSidebar() {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            sidebar.classList.toggle('open');
        } else {
            sidebar.classList.toggle('collapsed');
            document.body.classList.toggle('sidebar-closed');
        }
    }

    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }
    if (mobileBtn) {
        mobileBtn.addEventListener('click', toggleSidebar);
    }
}
