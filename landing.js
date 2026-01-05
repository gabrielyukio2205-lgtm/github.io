// Landing Page - Floating ASCII Background
// Inspired by Jules.google - floating code letters

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Setup canvas size
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Characters to float - code/terminal style
    const chars = 'JADE{}[]<>()=>;:./\\|01ABCDEF#$%&*+-./?@^_~'.split('');

    // Particle class for floating letters
    class Particle {
        constructor() {
            this.reset();
            // Start at random Y position for initial spread
            this.y = Math.random() * canvas.height;
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + 50;
            this.char = chars[Math.floor(Math.random() * chars.length)];
            this.speed = 0.3 + Math.random() * 0.8;
            this.size = 12 + Math.random() * 16;
            this.opacity = 0.03 + Math.random() * 0.12;
            this.drift = (Math.random() - 0.5) * 0.3;

            // Color palette - indigo/purple/cyan like Jules
            const colors = [
                { r: 99, g: 102, b: 241 },   // Indigo
                { r: 139, g: 92, b: 246 },   // Purple
                { r: 168, g: 85, b: 247 },   // Violet
                { r: 59, g: 130, b: 246 },   // Blue
                { r: 34, g: 211, b: 238 },   // Cyan
            ];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.y -= this.speed;
            this.x += this.drift;

            // Subtle wave motion
            this.x += Math.sin(this.y * 0.01) * 0.2;

            if (this.y < -50) {
                this.reset();
            }
        }

        draw() {
            ctx.save();
            ctx.font = `${this.size}px 'JetBrains Mono', 'Fira Code', monospace`;
            ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.opacity})`;
            ctx.fillText(this.char, this.x, this.y);
            ctx.restore();
        }
    }

    // Create particles - not too many for subtle effect
    const particles = [];
    const particleCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));

    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        // Clear with dark background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });
    }

    animate();

    // Scroll animations for content
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
