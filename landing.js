// Landing Page - Floating ASCII Background with Theme Support
// Inspired by Jules.google - floating code letters

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Theme detection and management
    let isDarkMode = true;

    function detectTheme() {
        const saved = localStorage.getItem('jade-theme');
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
        localStorage.setItem('jade-theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    }

    // Expose toggle for button
    window.toggleJadeTheme = toggleTheme;

    // Setup canvas size
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Characters to float - code/terminal style with JADE emphasis
    const codeChars = '{}[]<>()=>;:./\\|01#$%&*+-@^_~'.split('');
    const jadeChars = ['J', 'A', 'D', 'E', 'J', 'A', 'D', 'E']; // More JADE letters
    const allChars = [...codeChars, ...jadeChars, ...jadeChars]; // Weight towards JADE

    // Color palettes
    const darkColors = [
        { r: 99, g: 102, b: 241 },   // Indigo
        { r: 139, g: 92, b: 246 },   // Purple
        { r: 168, g: 85, b: 247 },   // Violet
        { r: 59, g: 130, b: 246 },   // Blue
        { r: 34, g: 211, b: 238 },   // Cyan
        { r: 16, g: 185, b: 129 },   // Emerald
    ];

    const lightColors = [
        { r: 79, g: 70, b: 229 },    // Indigo darker
        { r: 124, g: 58, b: 237 },   // Purple darker
        { r: 147, g: 51, b: 234 },   // Violet darker
        { r: 37, g: 99, b: 235 },    // Blue darker
        { r: 6, g: 182, b: 212 },    // Cyan darker
        { r: 5, g: 150, b: 105 },    // Emerald darker
    ];

    // Particle class for floating letters
    class Particle {
        constructor() {
            this.reset();
            this.y = Math.random() * canvas.height;
        }

        updateColors() {
            const colors = isDarkMode ? darkColors : lightColors;
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 50;
            this.char = allChars[Math.floor(Math.random() * allChars.length)];
            this.speed = 0.4 + Math.random() * 1.0;
            this.size = 14 + Math.random() * 22;
            // MORE VISIBLE opacity
            this.opacity = 0.08 + Math.random() * 0.18;
            this.drift = (Math.random() - 0.5) * 0.4;

            // Make JADE letters brighter
            if (jadeChars.includes(this.char)) {
                this.opacity *= 1.5;
                this.size *= 1.2;
            }

            this.updateColors();
        }

        update() {
            this.y -= this.speed;
            this.x += this.drift;
            this.x += Math.sin(this.y * 0.008) * 0.3;

            if (this.y < -60) {
                this.reset();
            }
        }

        draw() {
            const bgColor = isDarkMode ? '#0a0a0f' : '#f8fafc';

            ctx.save();
            ctx.font = `600 ${this.size}px 'JetBrains Mono', 'Fira Code', 'Consolas', monospace`;

            // Light glow for JADE letters
            if (jadeChars.includes(this.char)) {
                ctx.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.5)`;
                ctx.shadowBlur = 10;
            }

            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
            ctx.fillText(this.char, this.x, this.y);
            ctx.restore();
        }
    }

    // Create particles - more for better coverage
    const particles = [];
    const particleCount = Math.min(120, Math.floor((canvas.width * canvas.height) / 10000));

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Clear with theme background
        ctx.fillStyle = isDarkMode ? '#0a0a0f' : '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

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
        if (!localStorage.getItem('jade-theme')) {
            isDarkMode = e.matches;
            applyTheme();
        }
    });

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
