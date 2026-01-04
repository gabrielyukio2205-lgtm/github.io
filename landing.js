// Landing Page - WebGL Background Animation
// Neural mesh / particle network effect using Three.js

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

    // Particles
    const particleCount = 150;
    const particles = [];
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 10 - 5;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        particles.push({ x, y, z, index: i });
        velocities.push({
            x: (Math.random() - 0.5) * 0.01,
            y: (Math.random() - 0.5) * 0.01,
            z: (Math.random() - 0.5) * 0.005
        });
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x6366f1,
        size: 0.08,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // Lines (connections)
    const lineGeometry = new THREE.BufferGeometry();
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x6366f1,
        transparent: true,
        opacity: 0.15
    });

    const linePositions = new Float32Array(particleCount * particleCount * 6);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    camera.position.z = 8;

    // Mouse interaction
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        const positionsArray = particleSystem.geometry.attributes.position.array;

        // Update particle positions
        for (let i = 0; i < particleCount; i++) {
            positionsArray[i * 3] += velocities[i].x;
            positionsArray[i * 3 + 1] += velocities[i].y;
            positionsArray[i * 3 + 2] += velocities[i].z;

            // Boundary check - wrap around
            if (positionsArray[i * 3] > 10) positionsArray[i * 3] = -10;
            if (positionsArray[i * 3] < -10) positionsArray[i * 3] = 10;
            if (positionsArray[i * 3 + 1] > 10) positionsArray[i * 3 + 1] = -10;
            if (positionsArray[i * 3 + 1] < -10) positionsArray[i * 3 + 1] = 10;
            if (positionsArray[i * 3 + 2] > 5) positionsArray[i * 3 + 2] = -10;
            if (positionsArray[i * 3 + 2] < -10) positionsArray[i * 3 + 2] = 5;

            particles[i].x = positionsArray[i * 3];
            particles[i].y = positionsArray[i * 3 + 1];
            particles[i].z = positionsArray[i * 3 + 2];
        }

        particleSystem.geometry.attributes.position.needsUpdate = true;

        // Update lines (connect nearby particles)
        const linePositionsArray = lines.geometry.attributes.position.array;
        let lineIndex = 0;
        const maxDistance = 2.5;

        for (let i = 0; i < particleCount; i++) {
            for (let j = i + 1; j < particleCount; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dz = particles[i].z - particles[j].z;
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance < maxDistance && lineIndex < linePositionsArray.length - 6) {
                    linePositionsArray[lineIndex++] = particles[i].x;
                    linePositionsArray[lineIndex++] = particles[i].y;
                    linePositionsArray[lineIndex++] = particles[i].z;
                    linePositionsArray[lineIndex++] = particles[j].x;
                    linePositionsArray[lineIndex++] = particles[j].y;
                    linePositionsArray[lineIndex++] = particles[j].z;
                }
            }
        }

        // Clear remaining lines
        for (let i = lineIndex; i < linePositionsArray.length; i++) {
            linePositionsArray[i] = 0;
        }

        lines.geometry.attributes.position.needsUpdate = true;

        // Camera subtle movement based on mouse
        camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
        camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

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
