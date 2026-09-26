// A real Three.js scene: an identity-fabric network sphere built from
// THREE.Points (fibonacci distribution), a geodesic wireframe shell and a
// glowing core. Rendered on a raw <canvas> with manual rAF, DPR capping,
// mouse parallax and full disposal.
import { useEffect, useRef } from "react";
import * as THREE from "three";

function fibonacciSphere(count, radius) {
  const positions = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const theta = golden * i;
    const r = Math.sqrt(1 - y * y);
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return positions;
}

export default function SphericalNetwork({
  pointCount = 1500,
  sphereRadius = 2.3,
  color = "#22d3ee",
  speed = 0.18,
  parallax = 0.6,
  className = "spherical-canvas"
}) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const group = new THREE.Group();
    scene.add(group);

    // --- outer points: identity fabric ---
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(fibonacciSphere(pointCount, sphereRadius), 3));
    const pointsMat = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const points = new THREE.Points(pointsGeo, pointsMat);
    group.add(points);

    // --- geodesic shell ---
    const shellGeo = new THREE.IcosahedronGeometry(sphereRadius * 1.06, 1);
    const shellMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      wireframe: true,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    group.add(shell);

    // --- inner core ---
    const coreGeo = new THREE.IcosahedronGeometry(sphereRadius * 0.42, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#67e8f9"),
      wireframe: true,
      transparent: true,
      opacity: 0.7
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    group.add(core);

    // --- orbital rings ---
    const ringGeo = new THREE.TorusGeometry(sphereRadius * 1.45, 0.004, 8, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.rotation.x = Math.PI / 2.4;
    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.z = Math.PI / 3.4;
    group.add(ring1, ring2);

    const cameraTarget = new THREE.Vector2(0, 0);

    function resize() {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    const pointer = { x: 0, y: 0 };
    const onPointerMove = e => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    mount.addEventListener("pointermove", onPointerMove);

    const clock = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;

      group.rotation.y += dt * speed;
      group.rotation.x = Math.sin(t * 0.12) * 0.12;
      points.rotation.y -= dt * speed * 0.45;
      core.rotation.y -= dt * speed * 2.2;
      core.rotation.x += dt * speed * 1.4;
      ring1.rotation.z += dt * 0.06;
      ring2.rotation.x += dt * 0.05;

      cameraTarget.x += (pointer.x * parallax * 0.9 - cameraTarget.x) * 0.05;
      cameraTarget.y += (pointer.y * parallax * 0.6 - cameraTarget.y) * 0.05;
      camera.position.x = cameraTarget.x;
      camera.position.y = cameraTarget.y;
      camera.lookAt(0, 0, 0);

      // breathing pulse on the point cloud
      pointsMat.size = 0.045 + Math.sin(t * 1.2) * 0.008;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeChild(renderer.domElement);
      pointsGeo.dispose();
      pointsMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, [pointCount, sphereRadius, color, speed, parallax]);

  return <div ref={mountRef} className={className} />;
}