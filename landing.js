// Landing Page - Particle Text Effect
// Particles form the text "J.A.D.E."

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0f, 1);

    // Colors
    const colors = [0x4285f4, 0xea4335, 0xfbbc04, 0x34a853, 0x9333ea, 0x06b6d4];

    // Create particle texture
    function createParticleTexture() {
        const size = 64;
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = size;
        ctx.canvas.height = size;

        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        const texture = new THREE.Texture(ctx.canvas);
        texture.needsUpdate = true;
        return texture;
    }

    const particleTexture = createParticleTexture();

    // Get text positions
    function getTextPositions(text, fontSize) {
        const ctx2d = document.createElement('canvas').getContext('2d');
        ctx2d.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        const metrics = ctx2d.measureText(text);

        const w = Math.ceil(metrics.width) + 60;
        const h = Math.ceil(fontSize * 1.5) + 60;

        const offCanvas = document.createElement('canvas');
        offCanvas.width = w;
        offCanvas.height = h;
        const ctx = offCanvas.getContext('2d');

        ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2);

        const imageData = ctx.getImageData(0, 0, w, h);
        const positions = [];

        for (let y = 0; y < h; y += 4) {
            for (let x = 0; x < w; x += 4) {
                const i = (y * w + x) * 4;
                if (imageData.data[i + 3] > 128) {
                    positions.push({
                        x: x - w / 2,
                        y: y - h / 2
                    });
                }
            }
        }
        return positions;
    }

    // Create particles
    const textPositions = getTextPositions('J.A.D.E.', 80);
    const particles = [];

    // Main text particles
    textPositions.slice(0, 400).forEach((pos, i) => {
        const material = new THREE.SpriteMaterial({
            map: particleTexture,
            color: colors[i % colors.length],
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const sprite = new THREE.Sprite(material);

        // Random start position
        sprite.position.set(
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 30,
            (Math.random() - 0.5) * 10
        );

        sprite.userData = {
            targetX: pos.x * 0.04,
            targetY: pos.y * 0.04,
            targetZ: 0,
            startX: sprite.position.x,
            startY: sprite.position.y,
            startZ: sprite.position.z,
            delay: i * 2,
            duration: 150
        };

        sprite.scale.set(0.15, 0.15, 1);
        particles.push(sprite);
        scene.add(sprite);
    });

    // Extra floating particles
    for (let i = 0; i < 50; i++) {
        const material = new THREE.SpriteMaterial({
            map: particleTexture,
            color: colors[i % colors.length],
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });

        const sprite = new THREE.Sprite(material);
        sprite.position.set(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 15,
            (Math.random() - 0.5) * 5
        );

        sprite.userData = {
            isExtra: true,
            baseX: sprite.position.x,
            baseY: sprite.position.y,
            baseZ: sprite.position.z,
            speed: 0.01 + Math.random() * 0.02,
            amp: 0.5 + Math.random() * 1,
            phase: Math.random() * Math.PI * 2
        };

        sprite.scale.set(0.08, 0.08, 1);
        particles.push(sprite);
        scene.add(sprite);
    }

    // Position camera
    camera.position.z = 8;

    // Mouse tracking
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Animation
    let frame = 0;

    function animate() {
        requestAnimationFrame(animate);
        frame++;

        particles.forEach((p) => {
            const data = p.userData;

            if (data.isExtra) {
                // Floating particles
                p.position.x = data.baseX + Math.sin(frame * data.speed + data.phase) * data.amp;
                p.position.y = data.baseY + Math.cos(frame * data.speed * 0.7 + data.phase) * data.amp;
                p.position.z = data.baseZ + Math.sin(frame * data.speed * 0.5) * 0.5;
                p.material.opacity = 0.2 + Math.sin(frame * 0.05 + data.phase) * 0.15;
            } else {
                // Text particles with delay
                const elapsed = Math.max(0, frame - data.delay);
                const progress = Math.min(elapsed / data.duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

                // Interpolate with slight wobble
                const wobble = Math.sin(frame * 0.05 + data.phase) * 0.1 * (1 - progress);

                p.position.x = data.startX + (data.targetX + mouseX * 0.2 + wobble - data.startX) * ease;
                p.position.y = data.startY + (data.targetY + mouseY * 0.2 - data.startY) * ease;
                p.position.z = data.startZ + (data.targetZ - data.startZ) * ease;

                // Fade in
                p.material.opacity = progress * 0.8;

                // Pulse
                const pulse = 1 + Math.sin(frame * 0.1 + data.phase) * 0.1;
                p.scale.set(0.15 * pulse, 0.15 * pulse, 1);
            }
        });

        // Camera follows mouse slightly
        camera.position.x = mouseX * 0.3;
        camera.position.y = mouseY * 0.3;
        camera.lookAt(0, 0, 0);

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
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .app-card, .section-header').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'all 0.6s ease';
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
