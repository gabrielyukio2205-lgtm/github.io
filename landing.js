// Landing Page - Particle Text Effect
// Particles form the text "J.A.D.E." like Gemini 3

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Colors palette
    const colors = [
        0x4285f4, // Blue
        0xea4335, // Red
        0xfbbc04, // Yellow
        0x34a853, // Green
        0x9333ea, // Purple
        0x06b6d4, // Cyan
        0xf97316, // Orange
        0x6366f1, // Indigo
        0xec4899, // Pink
    ];

    // Get text positions from 2D canvas
    function getTextPositions(text, fontSize = 180) {
        const offCanvas = document.createElement('canvas');
        const ctx = offCanvas.getContext('2d');

        ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        const metrics = ctx.measureText(text);

        offCanvas.width = metrics.width + 40;
        offCanvas.height = fontSize * 1.4;

        ctx.font = `bold ${fontSize}px Inter, Arial, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, offCanvas.width / 2, offCanvas.height / 2);

        const imageData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const positions = [];

        // Sample every few pixels
        const gap = 4;
        for (let y = 0; y < offCanvas.height; y += gap) {
            for (let x = 0; x < offCanvas.width; x += gap) {
                const i = (y * offCanvas.width + x) * 4;
                if (imageData.data[i + 3] > 128) {
                    // Normalize positions to center
                    const px = (x - offCanvas.width / 2) * 0.04;
                    const py = -(y - offCanvas.height / 2) * 0.04;
                    positions.push({ x: px, y: py, z: 0 });
                }
            }
        }

        return positions;
    }

    // Get target positions for "J.A.D.E."
    const textPositions = getTextPositions('J.A.D.E.');
    const particleCount = Math.min(textPositions.length, 800);
    const particles = [];

    // Create particle texture
    function createParticleTexture() {
        const tCanvas = document.createElement('canvas');
        tCanvas.width = 32;
        tCanvas.height = 32;
        const ctx = tCanvas.getContext('2d');

        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(16, 16, 16, 0, Math.PI * 2);
        ctx.fill();

        return new THREE.CanvasTexture(tCanvas);
    }

    const particleTexture = createParticleTexture();

    // Create particles
    for (let i = 0; i < particleCount; i++) {
        const targetPos = textPositions[i % textPositions.length];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const material = new THREE.SpriteMaterial({
            map: particleTexture,
            color: color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const sprite = new THREE.Sprite(material);

        // Start from random scattered positions
        const startAngle = Math.random() * Math.PI * 2;
        const startRadius = 8 + Math.random() * 8;
        sprite.position.set(
            Math.cos(startAngle) * startRadius,
            Math.sin(startAngle) * startRadius,
            (Math.random() - 0.5) * 2 - 8
        );

        sprite.userData = {
            targetX: targetPos.x,
            targetY: targetPos.y,
            targetZ: (Math.random() - 0.5) * 0.3 - 8,
            currentX: sprite.position.x,
            currentY: sprite.position.y,
            currentZ: sprite.position.z,
            scale: 0.15 + Math.random() * 0.1,
            phase: Math.random() * Math.PI * 2,
            orbitOffset: (Math.random() - 0.5) * 0.3,
            speed: 0.02 + Math.random() * 0.02
        };

        sprite.scale.set(sprite.userData.scale, sprite.userData.scale, 1);

        particles.push(sprite);
        scene.add(sprite);
    }

    // Add some extra floating particles around
    const extraParticleCount = 100;
    for (let i = 0; i < extraParticleCount; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const material = new THREE.SpriteMaterial({
            map: particleTexture,
            color: color,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });

        const sprite = new THREE.Sprite(material);
        const angle = Math.random() * Math.PI * 2;
        const radius = 6 + Math.random() * 6;

        sprite.position.set(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            (Math.random() - 0.5) * 3 - 8
        );

        sprite.userData = {
            isExtra: true,
            angle: angle,
            radius: radius,
            baseY: sprite.position.y,
            orbitSpeed: (Math.random() - 0.5) * 0.01,
            floatSpeed: 0.5 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2,
            scale: 0.08 + Math.random() * 0.06
        };

        sprite.scale.set(sprite.userData.scale, sprite.userData.scale, 1);

        particles.push(sprite);
        scene.add(sprite);
    }

    camera.position.z = 15;

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
    let formationProgress = 0;

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        time += 0.016;

        // Gradually form the text
        formationProgress = Math.min(formationProgress + 0.008, 1);
        const easeProgress = 1 - Math.pow(1 - formationProgress, 3); // Ease out cubic

        // Smooth mouse
        mouseX += (targetMouseX - mouseX) * 0.05;
        mouseY += (targetMouseY - mouseY) * 0.05;

        // Update particles
        particles.forEach((particle, i) => {
            const data = particle.userData;

            if (data.isExtra) {
                // Extra floating particles
                data.angle += data.orbitSpeed;
                particle.position.x = Math.cos(data.angle) * data.radius;
                particle.position.y = data.baseY + Math.sin(time * data.floatSpeed + data.phase) * 0.5;
                particle.position.z = Math.sin(data.angle) * data.radius * 0.2 - 8;

                // Mouse influence
                particle.position.x += mouseX * 0.5;
                particle.position.y += mouseY * 0.5;

                // Pulse
                particle.material.opacity = 0.3 + Math.sin(time + data.phase) * 0.2;
            } else {
                // Text particles - lerp to target
                const wobble = Math.sin(time * 2 + data.phase) * 0.1 * (1 - easeProgress * 0.5);

                data.currentX += (data.targetX + mouseX * 0.2 + wobble - data.currentX) * data.speed * 2;
                data.currentY += (data.targetY + mouseY * 0.2 + data.orbitOffset * Math.sin(time + data.phase) - data.currentY) * data.speed * 2;
                data.currentZ += (data.targetZ - data.currentZ) * data.speed;

                particle.position.x = data.currentX * easeProgress + particle.position.x * (1 - easeProgress * 0.1);
                particle.position.y = data.currentY * easeProgress + particle.position.y * (1 - easeProgress * 0.1);
                particle.position.z = data.currentZ;

                // Scale and opacity
                particle.material.opacity = 0.7 + Math.sin(time * 1.5 + data.phase) * 0.2;
                const pulseScale = data.scale * (1 + Math.sin(time + data.phase) * 0.1);
                particle.scale.set(pulseScale, pulseScale, 1);
            }
        });

        // Camera subtle movement
        camera.position.x = mouseX * 0.3;
        camera.position.y = mouseY * 0.3;
        camera.lookAt(0, 0, -8);

        renderer.render(scene, camera);
    }

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

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
