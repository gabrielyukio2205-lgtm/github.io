// Landing Page - Neural Mesh Background
// 3D wave mesh with connected lines - portfolio style

(function () {
    'use strict';

    const canvas = document.getElementById('webgl-bg');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 10);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setClearColor(0x0a0a0f, 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // REDUCED grid density for clearer visibility
    const gridWidth = 40;
    const gridHeight = 25;
    const spacing = 0.6;
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

    // Pre-calculate line count
    const horizontalLines = gridWidth * (gridHeight - 1);
    const verticalLines = (gridWidth - 1) * gridHeight;
    const totalLines = horizontalLines + verticalLines;

    const linePositions = new Float32Array(totalLines * 6);
    const lineColors = new Float32Array(totalLines * 6);

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    function updateLines() {
        let lineIdx = 0;

        for (let j = 0; j < gridHeight; j++) {
            for (let i = 0; i < gridWidth; i++) {
                const idx = j * gridWidth + i;
                const p = points[idx];

                // Connect to right neighbor
                if (i < gridWidth - 1) {
                    const rightIdx = j * gridWidth + (i + 1);
                    const pr = points[rightIdx];

                    const base = lineIdx * 6;
                    linePositions[base] = p.x;
                    linePositions[base + 1] = p.y;
                    linePositions[base + 2] = p.z;
                    linePositions[base + 3] = pr.x;
                    linePositions[base + 4] = pr.y;
                    linePositions[base + 5] = pr.z;

                    // Subtle cyan/indigo colors - visible but not overwhelming
                    const h1 = (p.y + 0.8) / 1.6;
                    const h2 = (pr.y + 0.8) / 1.6;
                    // Base: dark indigo, peaks: brighter cyan
                    lineColors[base] = 0.15 + h1 * 0.15;     // R
                    lineColors[base + 1] = 0.2 + h1 * 0.25;  // G
                    lineColors[base + 2] = 0.4 + h1 * 0.35;  // B
                    lineColors[base + 3] = 0.15 + h2 * 0.15;
                    lineColors[base + 4] = 0.2 + h2 * 0.25;
                    lineColors[base + 5] = 0.4 + h2 * 0.35;

                    lineIdx++;
                }

                // Connect to bottom neighbor
                if (j < gridHeight - 1) {
                    const bottomIdx = (j + 1) * gridWidth + i;
                    const pb = points[bottomIdx];

                    const base = lineIdx * 6;
                    linePositions[base] = p.x;
                    linePositions[base + 1] = p.y;
                    linePositions[base + 2] = p.z;
                    linePositions[base + 3] = pb.x;
                    linePositions[base + 4] = pb.y;
                    linePositions[base + 5] = pb.z;

                    const h1 = (p.y + 0.8) / 1.6;
                    const h2 = (pb.y + 0.8) / 1.6;
                    lineColors[base] = 0.15 + h1 * 0.15;
                    lineColors[base + 1] = 0.2 + h1 * 0.25;
                    lineColors[base + 2] = 0.4 + h1 * 0.35;
                    lineColors[base + 3] = 0.15 + h2 * 0.15;
                    lineColors[base + 4] = 0.2 + h2 * 0.25;
                    lineColors[base + 5] = 0.4 + h2 * 0.35;

                    lineIdx++;
                }
            }
        }

        lineGeometry.attributes.position.needsUpdate = true;
        lineGeometry.attributes.color.needsUpdate = true;
    }

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.6,  // Good visibility
        linewidth: 1
    });

    updateLines();
    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    lineMesh.rotation.x = -Math.PI * 0.45;
    lineMesh.position.y = -3;
    scene.add(lineMesh);

    // Points at intersections - more visible
    const pointPositions = new Float32Array(points.length * 3);
    const pointColors = new Float32Array(points.length * 3);

    points.forEach((p, i) => {
        pointPositions[i * 3] = p.x;
        pointPositions[i * 3 + 1] = p.y;
        pointPositions[i * 3 + 2] = p.z;
        // Bright cyan points
        pointColors[i * 3] = 0.3;
        pointColors[i * 3 + 1] = 0.5;
        pointColors[i * 3 + 2] = 0.9;
    });

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));

    const pointsMaterial = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        sizeAttenuation: true
    });

    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
    pointsMesh.rotation.x = -Math.PI * 0.45;
    pointsMesh.position.y = -3;
    scene.add(pointsMesh);

    // Mouse interaction
    let mouseX = 0, mouseY = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Animation
    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.008;

        // Smoother wave animation
        for (let j = 0; j < gridHeight; j++) {
            for (let i = 0; i < gridWidth; i++) {
                const idx = j * gridWidth + i;
                const orig = originalPositions[idx];

                // Gentle waves
                const wave1 = Math.sin(orig.x * 0.4 + time) * 0.4;
                const wave2 = Math.sin(orig.z * 0.25 + time * 0.6) * 0.3;
                const wave3 = Math.cos((orig.x + orig.z) * 0.15 + time * 0.8) * 0.2;

                points[idx].y = wave1 + wave2 + wave3;

                // Update point positions
                pointPositions[idx * 3 + 1] = points[idx].y;

                // Dynamic point colors based on height
                const h = (points[idx].y + 1) / 2;
                pointColors[idx * 3] = 0.2 + h * 0.2;
                pointColors[idx * 3 + 1] = 0.4 + h * 0.3;
                pointColors[idx * 3 + 2] = 0.7 + h * 0.3;
            }
        }

        pointsGeometry.attributes.position.needsUpdate = true;
        pointsGeometry.attributes.color.needsUpdate = true;
        updateLines();

        // Subtle camera movement
        camera.position.x = mouseX * 0.8;
        camera.position.y = 3 + mouseY * 0.4;
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
