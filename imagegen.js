/**
 * Image Gen - JavaScript Controller
 * Handles image generation with Chutes.ai models
 * Supports multi-image editing (1-3 images)
 */

// API Configuration - Same proxy used by other JADE pages
const PROXY_BASE_URL = 'https://jade-proxy.onrender.com';
const API_URL = `${PROXY_BASE_URL}/imagegen/generate`;

// DOM Elements
const modelBtns = document.querySelectorAll('.model-btn');
const promptInput = document.getElementById('prompt-input');
const uploadGroup = document.getElementById('upload-group');
const uploadZone = document.getElementById('upload-zone');
const imageUpload = document.getElementById('image-upload');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const uploadPreviews = document.getElementById('upload-previews');
const addMoreBtn = document.getElementById('add-more-btn');
const imageCountEl = document.getElementById('image-count');
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
let uploadedImages = []; // Array of { base64, name }
const MAX_IMAGES = 3;
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
                clearAllImages();
            }
        });
    });
}

// Upload Zone - Multi-image support
function initUploadZone() {
    // Click to upload (on placeholder or add button)
    uploadPlaceholder.addEventListener('click', (e) => {
        e.stopPropagation();
        imageUpload.click();
    });

    addMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        imageUpload.click();
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
        handleFiles(e.dataTransfer.files);
    });
}

function handleFileSelect(e) {
    handleFiles(e.target.files);
    // Reset input to allow re-selecting same files
    imageUpload.value = '';
}

function handleFiles(files) {
    for (const file of files) {
        if (uploadedImages.length >= MAX_IMAGES) {
            showError(`Máximo de ${MAX_IMAGES} imagens permitido`);
            break;
        }

        if (!file.type.startsWith('image/')) {
            continue;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImages.push({
                base64: e.target.result,
                name: file.name
            });
            renderImagePreviews();
        };
        reader.readAsDataURL(file);
    }
}

function renderImagePreviews() {
    // Update counter
    imageCountEl.textContent = uploadedImages.length;

    // Clear existing previews
    uploadPreviews.innerHTML = '';

    if (uploadedImages.length === 0) {
        // Show placeholder, hide add button
        uploadPlaceholder.classList.remove('hidden');
        addMoreBtn.classList.add('hidden');
        uploadPreviews.classList.add('hidden');
        return;
    }

    // Hide placeholder, show previews
    uploadPlaceholder.classList.add('hidden');
    uploadPreviews.classList.remove('hidden');

    // Show/hide add button based on count
    if (uploadedImages.length < MAX_IMAGES) {
        addMoreBtn.classList.remove('hidden');
    } else {
        addMoreBtn.classList.add('hidden');
    }

    // Render each image preview
    uploadedImages.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'upload-preview-item';
        item.innerHTML = `
            <img src="${img.base64}" alt="Imagem ${index + 1}">
            <span class="image-number">${index + 1}</span>
            <button class="remove-image-btn" data-index="${index}" title="Remover">×</button>
        `;

        // Remove button handler
        item.querySelector('.remove-image-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeImage(index);
        });

        uploadPreviews.appendChild(item);
    });
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    renderImagePreviews();
}

function clearAllImages() {
    uploadedImages = [];
    imageUpload.value = '';
    renderImagePreviews();
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

    if (selectedModel === 'qwen-edit' && uploadedImages.length === 0) {
        showError('Por favor, faça upload de pelo menos uma imagem para editar');
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

    // Send array of images for edit mode
    if (selectedModel === 'qwen-edit' && uploadedImages.length > 0) {
        request.images_base64 = uploadedImages.map(img => img.base64);
    }

    const seed = seedInput.value.trim();
    if (seed) {
        request.seed = parseInt(seed);
    }

    try {
        const response = await fetch(API_URL, {
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

        // Add as first image (clear others)
        uploadedImages = [{
            base64: `data:image/png;base64,${currentGeneratedImage.base64}`,
            name: 'generated-image.png'
        }];
        renderImagePreviews();

        // Clear prompt for edit instruction
        promptInput.value = '';
        promptInput.placeholder = 'Descreva a edição que você quer fazer... (ex: "Mude o fundo para uma praia")';
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
