// Landing Page - Neural Mesh Background
// 3D wave mesh with connected lines - portfolio style

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0); // Fundo totalmente transparente
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create mesh grid
    const gridWidth = 60;
    const gridHeight = 30;
    const spacing = 0.4;
    const points = [];
    const originalPositions = [];

    for (let j = 0; j < gridHeight; j++) {
        for (let i = 0; i < gridWidth; i++) {
            const x = (i - gridWidth / 2) * spacing;
            const z = (j - gridHeight / 2) * spacing;
            const y = 0;
            points.push(new THREE.Vector3(x, y, z));
            originalPositions.push({ x, y, z });
        }
    }

    // Create lines connecting the grid
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = [];
    const lineColors = [];

    function updateLines() {
        linePositions.length = 0;
        lineColors.length = 0;

        for (let j = 0; j < gridHeight; j++) {
            for (let i = 0; i < gridWidth; i++) {
                const idx = j * gridWidth + i;
                const p = points[idx];

                // Connect to right neighbor
                if (i < gridWidth - 1) {
                    const rightIdx = j * gridWidth + (i + 1);
                    const pr = points[rightIdx];
                    linePositions.push(p.x, p.y, p.z, pr.x, pr.y, pr.z);

                    // Dark blue/cyan gradient suited for black background
                    const h1 = (p.y + 1) / 2;
                    const h2 = (pr.y + 1) / 2;
                    // RGB: Less red, less green, high blue
                    lineColors.push(
                        0.1 + h1 * 0.1, 0.1 + h1 * 0.2, 0.6 + h1 * 0.4,
                        0.1 + h2 * 0.1, 0.1 + h2 * 0.2, 0.6 + h2 * 0.4
                    );
                }

                // Connect to bottom neighbor
                if (j < gridHeight - 1) {
                    const bottomIdx = (j + 1) * gridWidth + i;
                    const pb = points[bottomIdx];
                    linePositions.push(p.x, p.y, p.z, pb.x, pb.y, pb.z);

                    const h1 = (p.y + 1) / 2;
                    const h2 = (pb.y + 1) / 2;
                    lineColors.push(
                        0.1 + h1 * 0.1, 0.1 + h1 * 0.2, 0.6 + h1 * 0.4,
                        0.1 + h2 * 0.1, 0.1 + h2 * 0.2, 0.6 + h2 * 0.4
                    );
                }
            }
        }

        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    }

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.2, // Much more subtle
        linewidth: 1
    });

    updateLines();
    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    lineMesh.rotation.x = -Math.PI * 0.4;
    lineMesh.position.y = -2;
    scene.add(lineMesh);

    // Add points at intersections
    const pointsGeometry = new THREE.BufferGeometry();
    const pointPositions = new Float32Array(points.length * 3);
    const pointColors = new Float32Array(points.length * 3);

    points.forEach((p, i) => {
        pointPositions[i * 3] = p.x;
        pointPositions[i * 3 + 1] = p.y;
        pointPositions[i * 3 + 2] = p.z;
        pointColors[i * 3] = 0.2;
        pointColors[i * 3 + 1] = 0.4;
        pointColors[i * 3 + 2] = 1.0;
    });

    pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
    pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(pointColors, 3));

    const pointsMaterial = new THREE.PointsMaterial({
        size: 2, // Smaller points
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true
    });

    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    pointsMesh.rotation.x = -Math.PI * 0.4;
    pointsMesh.position.y = -2;
    scene.add(pointsMesh);

    // Mouse
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Animation
    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.01;

        // Wave animation
        for (let j = 0; j < gridHeight; j++) {
            for (let i = 0; i < gridWidth; i++) {
                const idx = j * gridWidth + i;
                const orig = originalPositions[idx];

                // Multiple wave layers
                const wave1 = Math.sin(orig.x * 0.5 + time) * 0.3;
                const wave2 = Math.sin(orig.z * 0.3 + time * 0.7) * 0.2;
                const wave3 = Math.sin((orig.x + orig.z) * 0.2 + time * 1.2) * 0.15;

                points[idx].y = wave1 + wave2 + wave3;

                // Update point positions
                pointPositions[idx * 3 + 1] = points[idx].y;

                // Update point colors based on height
                const h = (points[idx].y + 1) / 2;
                pointColors[idx * 3] = 0.1 + h * 0.1;
                pointColors[idx * 3 + 1] = 0.2 + h * 0.2;
                pointColors[idx * 3 + 2] = 0.6 + h * 0.4;
            }
        }

        pointsGeometry.attributes.position.needsUpdate = true;
        pointsGeometry.attributes.color.needsUpdate = true;
        updateLines();
        lineGeometry.attributes.position.needsUpdate = true;
        lineGeometry.attributes.color.needsUpdate = true;

        // Camera movement based on mouse
        camera.position.x = mouseX * 0.5;
        camera.position.y = 2 + mouseY * 0.3;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    animate();

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
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
