// Landing Page - Particle Text Effect
// Particles form "J.A.D.E." text - Gemini 3 style

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
        window.innerWidth / -2, window.innerWidth / 2,
        window.innerHeight / 2, window.innerHeight / -2,
        1, 1000
    );
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Colors
    const colors = [0x4285f4, 0xea4335, 0xfbbc04, 0x34a853, 0x9333ea, 0x06b6d4, 0xf97316, 0x6366f1, 0xec4899];

    // Create text canvas to sample positions
    function getTextPositions(text) {
        const textCanvas = document.createElement('canvas');
        const ctx = textCanvas.getContext('2d');

        const fontSize = Math.min(window.innerWidth * 0.15, 200);
        ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        const textWidth = ctx.measureText(text).width;

        textCanvas.width = textWidth + 40;
        textCanvas.height = fontSize * 1.4;

        ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);

        const imageData = ctx.getImageData(0, 0, textCanvas.width, textCanvas.height);
        const positions = [];
        const gap = 3;

        for (let y = 0; y < textCanvas.height; y += gap) {
            for (let x = 0; x < textCanvas.width; x += gap) {
                const i = (y * textCanvas.width + x) * 4;
                if (imageData.data[i + 3] > 128) {
                    positions.push({
                        x: x - textCanvas.width / 2,
                        y: -(y - textCanvas.height / 2)
                    });
                }
            }
        }

        return { positions, width: textCanvas.width, height: textCanvas.height };
    }

    const textData = getTextPositions('J.A.D.E.');
    const particles = [];

    // Create particle texture
    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 32;
    particleCanvas.height = 32;
    const pctx = particleCanvas.getContext('2d');
    const gradient = pctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = gradient;
    pctx.beginPath();
    pctx.arc(16, 16, 16, 0, Math.PI * 2);
    pctx.fill();
    const particleTexture = new THREE.CanvasTexture(particleCanvas);

    // Create particles for text
    const offsetY = -50; // Move text up a bit from center

    textData.positions.forEach((pos, i) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.SpriteMaterial({
            map: particleTexture,
            color: color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const sprite = new THREE.Sprite(material);

        // Start from random positions
        const angle = Math.random() * Math.PI * 2;
        const radius = 300 + Math.random() * 500;

        sprite.position.x = Math.cos(angle) * radius;
        sprite.position.y = Math.sin(angle) * radius + offsetY;
        sprite.position.z = 0;

        const size = 4 + Math.random() * 4;
        sprite.scale.set(size, size, 1);

        sprite.userData = {
            targetX: pos.x,
            targetY: pos.y + offsetY,
            startX: sprite.position.x,
            startY: sprite.position.y,
            delay: i * 0.001,
            phase: Math.random() * Math.PI * 2
        };

        particles.push(sprite);
        scene.add(sprite);
    });

    // Extra floating particles
    for (let i = 0; i < 80; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.SpriteMaterial({
            map: particleTexture,
            color: color,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending
        });

        const sprite = new THREE.Sprite(material);
        const angle = Math.random() * Math.PI * 2;
        const radius = 200 + Math.random() * 400;

        sprite.position.x = Math.cos(angle) * radius;
        sprite.position.y = Math.sin(angle) * radius + offsetY;
        sprite.position.z = 0;

        const size = 3 + Math.random() * 3;
        sprite.scale.set(size, size, 1);

        sprite.userData = {
            isExtra: true,
            angle: angle,
            radius: radius,
            speed: 0.0005 + Math.random() * 0.001,
            floatAmp: 20 + Math.random() * 40,
            phase: Math.random() * Math.PI * 2
        };

        particles.push(sprite);
        scene.add(sprite);
    }

    // Mouse
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - window.innerWidth / 2) * 0.05;
        mouseY = -(e.clientY - window.innerHeight / 2) * 0.05;
    });

    // Animation
    let time = 0;
    let progress = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.016;
        progress = Math.min(progress + 0.005, 1);

        const ease = 1 - Math.pow(1 - progress, 4); // Ease out quart

        particles.forEach(p => {
            const d = p.userData;

            if (d.isExtra) {
                d.angle += d.speed;
                p.position.x = Math.cos(d.angle) * d.radius + mouseX;
                p.position.y = Math.sin(d.angle) * d.radius + offsetY + Math.sin(time + d.phase) * d.floatAmp + mouseY;
                p.material.opacity = 0.3 + Math.sin(time * 2 + d.phase) * 0.2;
            } else {
                // Lerp to target
                const t = Math.max(0, Math.min(1, (ease - d.delay * 10) / (1 - d.delay * 10)));
                p.position.x = d.startX + (d.targetX - d.startX) * t + mouseX * 0.3;
                p.position.y = d.startY + (d.targetY - d.startY) * t + mouseY * 0.3;

                // Subtle float
                p.position.x += Math.sin(time * 2 + d.phase) * 2;
                p.position.y += Math.cos(time * 1.5 + d.phase) * 2;

                p.material.opacity = 0.7 + Math.sin(time + d.phase) * 0.2;
            }
        });

        renderer.render(scene, camera);
    }

    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.left = window.innerWidth / -2;
        camera.right = window.innerWidth / 2;
        camera.top = window.innerHeight / 2;
        camera.bottom = window.innerHeight / -2;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
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
