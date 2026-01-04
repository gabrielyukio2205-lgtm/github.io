// Landing Page - Particle Text Effect
// Particles form the text "J.A.D.E."

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Colors palette
    const colors = [
        '#4285f4', // Blue
        '#ea4335', // Red
        '#fbbc04', // Yellow
        '#34a853', // Green
        '#9333ea', // Purple
        '#06b6d4', // Cyan
        '#f97316', // Orange
        '#6366f1', // Indigo
        '#ec4899', // Pink
    ];

    // Get text positions
    function getTextPositions(text, fontSize = 120) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        const metrics = tempCtx.measureText(text);

        tempCanvas.width = metrics.width + 60;
        tempCanvas.height = fontSize * 1.5;

        tempCtx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        tempCtx.fillStyle = 'white';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const positions = [];

        const gap = 3;
        for (let y = 0; y < tempCanvas.height; y += gap) {
            for (let x = 0; x < tempCanvas.width; x += gap) {
                const i = (y * tempCanvas.width + x) * 4;
                if (imageData.data[i + 3] > 128) {
                    positions.push({
                        x: x - tempCanvas.width / 2,
                        y: y - tempCanvas.height / 2
                    });
                }
            }
        }

        return positions;
    }

    // Create particles
    const textPositions = getTextPositions('J.A.D.E.', 100);
    const particles = [];
    const particleCount = Math.min(textPositions.length, 600);

    for (let i = 0; i < particleCount; i++) {
        const pos = textPositions[i % textPositions.length];
        const color = colors[Math.floor(Math.random() * colors.length)];

        particles.push({
            x: (Math.random() - 0.5) * canvas.width * 1.5,
            y: (Math.random() - 0.5) * canvas.height * 1.5,
            targetX: pos.x,
            targetY: pos.y,
            color: color,
            size: 2 + Math.random() * 2,
            speed: 0.02 + Math.random() * 0.03,
            phase: Math.random() * Math.PI * 2,
            delay: Math.random() * 100
        });
    }

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - canvas.width / 2) * 0.1;
        mouseY = (e.clientY - canvas.height / 2) * 0.1;
    });

    // Animation
    let time = 0;
    let formed = false;

    function animate() {
        requestAnimationFrame(animate);
        time++;

        // Clear canvas
        ctx.fillStyle = 'rgba(10, 10, 15, 1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Center of screen
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 - 50;

        // Gradually form text
        const formationProgress = Math.min(time / 150, 1);
        const easeProgress = 1 - Math.pow(1 - formationProgress, 3);

        particles.forEach((p, i) => {
            // Delayed start
            const delayFactor = Math.max(0, (i - p.delay) / 100);
            const effectiveProgress = Math.min(easeProgress * delayFactor * 2, 1);

            // Lerp to target
            const wobble = Math.sin(time * 0.05 + p.phase) * 3 * (1 - effectiveProgress);

            p.x += (centerX + p.targetX + mouseX + wobble - p.x) * p.speed;
            p.y += (centerY + p.targetY + mouseY - p.y) * p.speed;

            // Draw particle
            const alpha = 0.6 + Math.sin(time * 0.1 + p.phase) * 0.3;
            const size = p.size * (0.8 + Math.sin(time * 0.1 + p.phase) * 0.2);

            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Check if formed
        if (formationProgress >= 1 && !formed) {
            formed = true;
        }
    }

    animate();

    // Scroll animations for other sections
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card, .app-card, .section-header').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

})();
