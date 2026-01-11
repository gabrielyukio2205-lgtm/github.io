/**
 * Video Gen - JavaScript Controller
 * Handles video generation with LTX-2 on Chutes.ai
 */

// API Configuration
const PROXY_BASE_URL = 'https://jade-proxy.onrender.com';
const API_URL = `${PROXY_BASE_URL}/videogen/generate`;

// DOM Elements
const modeBtns = document.querySelectorAll('.mode-btn');
const promptInput = document.getElementById('prompt-input');
const uploadGroup = document.getElementById('upload-group');
const uploadZone = document.getElementById('upload-zone');
const imageUpload = document.getElementById('image-upload');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const uploadPreview = document.getElementById('upload-preview');
const previewImage = document.getElementById('preview-image');
const removeImageBtn = document.getElementById('remove-image-btn');
const durationSelect = document.getElementById('duration');
const resolutionSelect = document.getElementById('resolution');
const cameraMotionSelect = document.getElementById('camera-motion');
const generateBtn = document.getElementById('generate-btn');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultLoading = document.getElementById('result-loading');
const resultVideo = document.getElementById('result-video');
const resultError = document.getElementById('result-error');
const generatedVideo = document.getElementById('generated-video');
const errorMessage = document.getElementById('error-message');
const downloadBtn = document.getElementById('download-btn');
const useFrameBtn = document.getElementById('use-frame-btn');

// State
let selectedMode = 't2v';
let uploadedImageBase64 = null;
let currentVideoData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initModeSelector();
    initUploadZone();
    initGenerateButton();
    initResultActions();
    initSidebar();
});

// Mode Selector
function initModeSelector() {
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            selectedMode = btn.dataset.mode;

            // Show/hide upload zone for i2v mode
            if (selectedMode === 'i2v') {
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
    uploadZone.addEventListener('click', (e) => {
        if (e.target !== removeImageBtn && !removeImageBtn.contains(e.target)) {
            imageUpload.click();
        }
    });

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

// Generate Button
function initGenerateButton() {
    generateBtn.addEventListener('click', generateVideo);
}

async function generateVideo() {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showError('Por favor, digite um prompt');
        return;
    }

    if (selectedMode === 'i2v' && !uploadedImageBase64) {
        showError('Por favor, faça upload de uma imagem para animar');
        return;
    }

    // Show loading
    showLoading();

    // Build request
    const request = {
        prompt: prompt,
        mode: selectedMode,
        duration: parseInt(durationSelect.value),
        resolution: resolutionSelect.value,
        camera_motion: cameraMotionSelect.value,
        guidance_scale: 3.0
    };

    if (selectedMode === 'i2v' && uploadedImageBase64) {
        request.image_base64 = uploadedImageBase64;
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

        if (data.success && (data.video_base64 || data.video_url)) {
            currentVideoData = data;

            let videoSrc;
            if (data.video_base64) {
                const contentType = data.content_type || 'video/mp4';
                videoSrc = `data:${contentType};base64,${data.video_base64}`;
            } else {
                videoSrc = data.video_url;
            }

            generatedVideo.querySelector('source').src = videoSrc;
            generatedVideo.load();
            showResult();
        } else {
            showError(data.error || 'Erro ao gerar vídeo');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showError('Erro de conexão. Verifique o servidor.');
    }
}

// UI State Management
function showLoading() {
    resultPlaceholder.classList.add('hidden');
    resultVideo.classList.add('hidden');
    resultError.classList.add('hidden');
    resultLoading.classList.remove('hidden');
    generateBtn.disabled = true;
}

function showResult() {
    resultPlaceholder.classList.add('hidden');
    resultLoading.classList.add('hidden');
    resultError.classList.add('hidden');
    resultVideo.classList.remove('hidden');
    generateBtn.disabled = false;
}

function showError(message) {
    resultPlaceholder.classList.add('hidden');
    resultLoading.classList.add('hidden');
    resultVideo.classList.add('hidden');
    resultError.classList.remove('hidden');
    errorMessage.textContent = message;
    generateBtn.disabled = false;
}

// Result Actions
function initResultActions() {
    // Download
    downloadBtn.addEventListener('click', () => {
        if (!currentVideoData) return;

        const link = document.createElement('a');

        if (currentVideoData.video_base64) {
            link.href = `data:video/mp4;base64,${currentVideoData.video_base64}`;
        } else if (currentVideoData.video_url) {
            link.href = currentVideoData.video_url;
        }

        link.download = `jade-videogen-${Date.now()}.mp4`;
        link.click();
    });

    // Use frame as image (capture current frame)
    useFrameBtn.addEventListener('click', () => {
        if (!generatedVideo) return;

        const canvas = document.createElement('canvas');
        canvas.width = generatedVideo.videoWidth;
        canvas.height = generatedVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(generatedVideo, 0, 0);

        const frameBase64 = canvas.toDataURL('image/png');

        // Open in ImageGen with this frame
        localStorage.setItem('jade_videogen_frame', frameBase64);
        window.location.href = 'imagegen.html?from=videogen';
    });
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
