import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Dev-only viewer for public/models/fases-cannabis.glb (open with #modellab, ?stage=1..5). */
const STAGES = ['etapa_01_germinacion', 'etapa_02_plantula', 'etapa_03_vegetativo', 'etapa_04_prefloracion', 'etapa_05_floracion'];

const Model: React.FC<{ stage: number }> = ({ stage }) => {
  const gltf = useLoader(GLTFLoader, '/models/fases-cannabis.glb');
  const scene = useMemo(() => gltf.scene.clone(true), [gltf]);
  const box = useMemo(() => {
    const b = new THREE.Box3();
    scene.children[0]?.children.forEach((c) => { if (c.name === STAGES[stage]) b.setFromObject(c); });
    return b;
  }, [scene, stage]);
  useEffect(() => {
    scene.traverse((o) => { if (STAGES.includes(o.name)) o.visible = o.name === STAGES[stage]; });
    const size = box.getSize(new THREE.Vector3());
    console.log('STAGE', stage, 'size', size.toArray().map((v) => +v.toFixed(3)), 'min', box.min.toArray().map((v) => +v.toFixed(3)));
  }, [scene, stage, box]);
  return <primitive object={scene} />;
};

const Rig: React.FC<{ stage: number }> = ({ stage }) => {
  const [center] = useState(() => new THREE.Vector3());
  return (
    <group>
      <Model stage={stage} />
      <axesHelper args={[0.2]} />
    </group>
  );
};

export const ModelLab: React.FC = () => {
  const stage = Number(new URLSearchParams(window.location.search).get('stage') || 5) - 1;
  const cam = [[0.35, 0.16, 0.45], [0.45, 0.2, 0.55], [0.9, 0.5, 1.1], [1.1, 0.7, 1.4], [1.3, 0.9, 1.7]][stage] || [1, 0.7, 1.4];
  const target = [[0, 0.03, 0], [0, 0.08, 0], [0, 0.3, 0], [0, 0.45, 0], [0, 0.55, 0]][stage] || [0, 0.4, 0];
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a1512' }}>
      <Canvas camera={{ position: cam as [number, number, number], fov: 40, near: 0.01, far: 50 }} onCreated={({ camera }) => camera.lookAt(target[0], target[1], target[2])}>
        <color attach="background" args={['#0a1512']} />
        <hemisphereLight args={['#dff6ff', '#1a2a1a', 1.2]} />
        <directionalLight position={[2, 4, 3]} intensity={2.4} />
        <Suspense fallback={null}>
          <Rig stage={stage} />
        </Suspense>
      </Canvas>
    </div>
  );
};
