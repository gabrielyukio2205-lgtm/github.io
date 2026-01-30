/**
 * Video Gen - JavaScript Controller
 * Handles video generation with LTX-2 and Wan 2.2 on Chutes.ai
 */

// API Configuration - Direct to HF Space (bypass proxy for long video requests)
const HF_SPACE_URL = 'https://madras1-jade-port.hf.space';
const API_URL = `${HF_SPACE_URL}/videogen/generate`;

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
const aspectRatioSelect = document.getElementById('aspect-ratio');
const aspectAutoBadge = document.getElementById('aspect-auto-badge');
const cameraMotionSelect = document.getElementById('camera-motion');
const generateBtn = document.getElementById('generate-btn');
const modelSelect = document.getElementById('model');
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
let selectedModel = 'ltx-2';
let uploadedImageBase64 = null;
let currentVideoData = null;
let autoDetectedAspectRatio = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initModeSelector();
    initModelSelector();
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
                autoDetectedAspectRatio = null;
                aspectAutoBadge.classList.add('hidden');
            }

            // Update model options based on mode
            updateModelOptions();
        });
    });
}

// Model Selector
function initModelSelector() {
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            selectedModel = modelSelect.value;
            updateCameraMotionVisibility();
        });
    }
}

function updateModelOptions() {
    if (!modelSelect) return;

    // Wan 2.2 only supports I2V
    const wanOption = modelSelect.querySelector('option[value="wan-2.2"]');
    if (wanOption) {
        if (selectedMode === 't2v') {
            wanOption.disabled = true;
            if (selectedModel === 'wan-2.2') {
                modelSelect.value = 'ltx-2';
                selectedModel = 'ltx-2';
            }
        } else {
            wanOption.disabled = false;
        }
    }
}

function updateCameraMotionVisibility() {
    // Camera motion only works with LTX-2
    const cameraGroup = cameraMotionSelect?.closest('.option-item');
    const durationGroup = durationSelect?.closest('.option-item');

    if (selectedModel === 'wan-2.2') {
        // Disable camera motion for Wan 2.2
        if (cameraGroup) {
            cameraGroup.style.opacity = '0.5';
            cameraMotionSelect.disabled = true;
        }
        // Hide duration for Wan 2.2 (always ~5s)
        if (durationGroup) {
            durationGroup.style.opacity = '0.5';
            durationSelect.disabled = true;
            durationSelect.value = '5'; // Force 5 seconds
        }
    } else {
        // Enable all for LTX-2
        if (cameraGroup) {
            cameraGroup.style.opacity = '1';
            cameraMotionSelect.disabled = false;
        }
        if (durationGroup) {
            durationGroup.style.opacity = '1';
            durationSelect.disabled = false;
        }
    }
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

        // Auto-detect aspect ratio from image
        detectImageAspectRatio(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Detect aspect ratio from uploaded image
function detectImageAspectRatio(base64) {
    const img = new Image();
    img.onload = () => {
        const w = img.width;
        const h = img.height;
        const ratio = w / h;

        let detectedRatio;
        if (ratio > 1.3) {
            // Landscape (wider than 4:3)
            detectedRatio = '16:9';
        } else if (ratio < 0.77) {
            // Portrait (taller than 3:4)
            detectedRatio = '9:16';
        } else {
            // Square-ish
            detectedRatio = '1:1';
        }

        // Auto-set the aspect ratio
        autoDetectedAspectRatio = detectedRatio;
        aspectRatioSelect.value = detectedRatio;
        aspectAutoBadge.classList.remove('hidden');

        console.log(`🖼️ Image ${w}x${h} (ratio ${ratio.toFixed(2)}) → ${detectedRatio}`);
    };
    img.src = base64;
}

function clearUploadedImage() {
    uploadedImageBase64 = null;
    imageUpload.value = '';
    previewImage.src = '';
    uploadPlaceholder.classList.remove('hidden');
    uploadPreview.classList.add('hidden');

    // Reset auto-detected aspect ratio
    autoDetectedAspectRatio = null;
    aspectAutoBadge.classList.add('hidden');
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
        model: selectedModel,
        duration: parseInt(durationSelect.value),
        resolution: resolutionSelect.value,
        aspect_ratio: aspectRatioSelect.value,
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
