// Landing Page - Gemini-style Particle Burst Animation
// Colorful particles orbiting/dispersing from center with J.A.D.E. text

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Colors palette (Gemini-like)
    const colors = [
        0x4285f4, // Blue
        0xea4335, // Red
        0xfbbc04, // Yellow
        0x34a853, // Green
        0x9333ea, // Purple
        0x06b6d4, // Cyan
        0xf97316, // Orange
        0x6366f1, // Indigo (main J.A.D.E. color)
    ];

    // Particle system for burst effect
    const particleCount = 300;
    const particles = [];

    // Create particles as individual sprites for better control
    const particleTexture = createParticleTexture();

    for (let i = 0; i < particleCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.SpriteMaterial({
            map: particleTexture,
            color: color,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        const sprite = new THREE.Sprite(material);

        // Initial position - start from center
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 2;
        const height = (Math.random() - 0.5) * 2;

        sprite.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius - 5
        );

        // Store animation properties
        sprite.userData = {
            angle: angle,
            radius: radius,
            baseY: height,
            speed: 0.2 + Math.random() * 0.3,
            amplitude: 0.3 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2,
            scale: 0.03 + Math.random() * 0.05,
            expanding: true,
            maxRadius: 3 + Math.random() * 3,
            orbitSpeed: (Math.random() - 0.5) * 0.02
        };

        sprite.scale.set(sprite.userData.scale, sprite.userData.scale, 1);

        particles.push(sprite);
        scene.add(sprite);
    }

    // Create circular particle texture
    function createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    camera.position.z = 8;

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    document.addEventListener('mousemove', (e) => {
        targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
        targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Time
    let time = 0;

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        time += 0.016;

        // Smooth mouse
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        // Update particles - Gemini-like orbital/burst motion
        particles.forEach((particle, i) => {
            const data = particle.userData;

            // Orbital motion
            data.angle += data.orbitSpeed;

            // Breathing/expanding effect
            const breathe = Math.sin(time * data.speed + data.phase) * 0.3;
            const currentRadius = data.radius + breathe;

            // Position
            particle.position.x = Math.cos(data.angle) * currentRadius;
            particle.position.y = data.baseY + Math.sin(time * data.speed * 0.5 + data.phase) * data.amplitude;
            particle.position.z = Math.sin(data.angle) * currentRadius - 5;

            // Subtle mouse interaction
            particle.position.x += mouseX * 0.3;
            particle.position.y += mouseY * 0.3;

            // Pulse opacity
            particle.material.opacity = 0.4 + Math.sin(time * 2 + data.phase) * 0.3;

            // Scale pulse
            const scalePulse = data.scale * (1 + Math.sin(time * 1.5 + data.phase) * 0.2);
            particle.scale.set(scalePulse, scalePulse, 1);
        });

        // Camera subtle movement
        camera.position.x = mouseX * 0.3;
        camera.position.y = mouseY * 0.3;
        camera.lookAt(0, 0, -5);

        renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Scroll animations
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

    // Observe elements
    document.querySelectorAll('.feature-card, .app-card, .section-header').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add animate-in class styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .animate-in {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

})();
