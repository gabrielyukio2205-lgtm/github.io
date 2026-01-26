// Landing Page - Floating ASCII Background with Theme Support
// Inspired by Jules.google - floating code letters

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = canvas.parentElement || document.body;
    let sceneWidth = 0;
    let sceneHeight = 0;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Theme detection and management
    let isDarkMode = true;

    function detectTheme() {
        const saved = localStorage.getItem('jade_theme')
            || localStorage.getItem('jadeTheme')
            || localStorage.getItem('jade-theme');
        if (saved) {
            isDarkMode = saved === 'dark';
        } else {
            isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        applyTheme();
    }

    function applyTheme() {
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        // Update particle colors on theme change
        particles.forEach(p => p.updateColors());
    }

    function toggleTheme() {
        isDarkMode = !isDarkMode;
        localStorage.setItem('jade_theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    }

    // Expose toggle for button
    window.toggleJadeTheme = toggleTheme;

    // Characters to float - subtle ASCII with JADE emphasis
    const codeChars = '.:;*+=/\\|<>(){}[]'.split('');
    const jadeChars = ['J', 'A', 'D', 'E', '.'];
    const allChars = [...codeChars, ...jadeChars, ...jadeChars]; // Weight towards JADE

    // Color palettes
    const darkColors = [
        { r: 124, g: 108, b: 255 },  // Soft purple
        { r: 79, g: 209, b: 255 },   // Cyan
        { r: 246, g: 185, b: 92 },   // Warm accent
        { r: 140, g: 255, b: 215 },  // Mint
    ];

    const lightColors = [
        { r: 90, g: 96, b: 201 },    // Indigo
        { r: 56, g: 165, b: 215 },   // Cyan
        { r: 214, g: 155, b: 80 },   // Warm accent
        { r: 60, g: 168, b: 136 },   // Mint
    ];

    // Particle class for floating letters
    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * sceneHeight;
        }

        updateColors() {
            const colors = isDarkMode ? darkColors : lightColors;
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        reset() {
            this.x = Math.random() * sceneWidth;
            this.y = sceneHeight + 40;
            this.char = allChars[Math.floor(Math.random() * allChars.length)];
            this.speed = 0.35 + Math.random() * 0.85;
            this.size = 10 + Math.random() * 18;
            this.baseOpacity = 0.06 + Math.random() * 0.16;
            this.drift = (Math.random() - 0.5) * 0.4;
            this.twinkle = 0.6 + Math.random() * 0.9;
            this.phase = Math.random() * Math.PI * 2;

            // Make JADE letters brighter
            if (jadeChars.includes(this.char)) {
                this.baseOpacity *= 1.6;
                this.size *= 1.15;
            }

            this.updateColors();
        }

        update() {
            this.y -= this.speed;
            this.x += this.drift;
            this.x += Math.sin(this.y * 0.01) * 0.2;
            this.phase += 0.03 * this.twinkle;

            if (this.y < -40 || this.x < -40 || this.x > sceneWidth + 40) {
                this.reset();
            }
        }

        draw() {
            ctx.save();
            ctx.font = `600 ${this.size}px 'JetBrains Mono', 'Fira Code', 'Consolas', monospace`;

            // Light glow for JADE letters
            if (jadeChars.includes(this.char)) {
                ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.5)`;
                ctx.shadowBlur = 10;
            }

            const alpha = this.baseOpacity * (0.65 + Math.sin(this.phase) * 0.35);
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha})`;
            ctx.fillText(this.char, this.x, this.y);
            ctx.restore();
        }
    }

    const particles = [];
    let particleCount = 0;

    function setupParticles() {
        particles.length = 0;
        particleCount = Math.min(110, Math.floor((sceneWidth * sceneHeight) / 12000));
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }
    }

    // Setup canvas size
    function resize() {
        const rect = container.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        sceneWidth = rect.width;
        sceneHeight = rect.height;
        setupParticles();
    }
    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        ctx.clearRect(0, 0, sceneWidth, sceneHeight);

        particles.forEach(p => {
            p.update();
            p.draw();
        });
    }

    // Initialize theme and start animation
    detectTheme();
    animate();

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('jade_theme')) {
            isDarkMode = e.matches;
            applyTheme();
        }
    });

    // Subtle ASCII flicker using only J/A/D/E for the hero title.
    const asciiTitle = document.querySelector('.hero-title-ascii');
    const asciiLines = asciiTitle ? Array.from(asciiTitle.querySelectorAll('span')) : [];
    if (asciiLines.length) {
        const swapLetters = ['J', 'A', 'D', 'E'];
        const baseLines = asciiLines.map(span => span.textContent);
        const activeLines = baseLines.map(line => line.split(''));
        const timers = baseLines.map(line => Array.from(line, () => 0));
        const swapIndices = baseLines.map(line => {
            const indices = [];
            for (let i = 0; i < line.length; i++) {
                if (swapLetters.includes(line[i])) indices.push(i);
            }
            return indices;
        });

        const resetAscii = () => {
            asciiLines.forEach((span, index) => {
                span.textContent = baseLines[index];
                activeLines[index] = baseLines[index].split('');
                timers[index].fill(0);
            });
        };

        let lastTime = performance.now();
        let spawnTimer = 0.1;

        const tickAscii = (time) => {
            const dt = Math.min(0.05, (time - lastTime) / 1000);
            lastTime = time;

            if (!reducedMotionQuery.matches) {
                let needsRender = false;

                spawnTimer -= dt;
                if (spawnTimer <= 0) {
                    spawnTimer = 0.12 + Math.random() * 0.14;
                    const sparks = 2 + Math.floor(Math.random() * 3);

                    for (let i = 0; i < sparks; i++) {
                        const lineIndex = Math.floor(Math.random() * swapIndices.length);
                        const indices = swapIndices[lineIndex];
                        if (!indices.length) continue;
                        const pos = indices[Math.floor(Math.random() * indices.length)];
                        const baseChar = baseLines[lineIndex][pos];
                        let nextChar = swapLetters[Math.floor(Math.random() * swapLetters.length)];
                        if (nextChar === baseChar) {
                            nextChar = swapLetters[(swapLetters.indexOf(nextChar) + 1) % swapLetters.length];
                        }
                        activeLines[lineIndex][pos] = nextChar;
                        timers[lineIndex][pos] = 0.2 + Math.random() * 0.25;
                        needsRender = true;
                    }
                }

                for (let lineIndex = 0; lineIndex < timers.length; lineIndex++) {
                    const lineTimers = timers[lineIndex];
                    const lineBase = baseLines[lineIndex];
                    const lineActive = activeLines[lineIndex];

                    for (let i = 0; i < lineTimers.length; i++) {
                        if (lineTimers[i] > 0) {
                            lineTimers[i] -= dt;
                            if (lineTimers[i] <= 0) {
                                lineActive[i] = lineBase[i];
                                needsRender = true;
                            }
                        }
                    }
                }

                if (needsRender) {
                    asciiLines.forEach((span, index) => {
                        span.textContent = activeLines[index].join('');
                    });
                }
            }

            requestAnimationFrame(tickAscii);
        };

        if (reducedMotionQuery.matches) {
            resetAscii();
        }
        reducedMotionQuery.addEventListener('change', (event) => {
            if (event.matches) resetAscii();
        });

        requestAnimationFrame(tickAscii);
    }

    // Scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('animate-in');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .app-card, .section-header').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s, transform 0.6s';
        observer.observe(el);
    });

    const style = document.createElement('style');
    style.textContent = '.animate-in { opacity: 1 !important; transform: translateY(0) !important; }';
    document.head.appendChild(style);
})();
