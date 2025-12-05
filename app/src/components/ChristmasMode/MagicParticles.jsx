import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

// 聖誕樹上的閃爍星光
export function TreeSparkles({ count = 100 }) {
  const pointsRef = useRef();
  const noise3D = useMemo(() => createNoise3D(), []);
  
  const { positions, colors, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    
    // 聖誕樹範圍內的隨機分布
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 圓錐形分布 (聖誕樹形狀)
      const height = Math.random() * 8; // 樹高
      const radius = (1 - height / 8) * 3 + 0.5; // 上窄下寬
      const angle = Math.random() * Math.PI * 2;
      
      positions[i3] = Math.cos(angle) * radius * Math.random();
      positions[i3 + 1] = height + 0.5;
      positions[i3 + 2] = Math.sin(angle) * radius * Math.random();
      
      // 聖誕色彩：金、紅、白
      const colorChoice = Math.random();
      if (colorChoice < 0.4) {
        // 金色
        colors[i3] = 1;
        colors[i3 + 1] = 0.84;
        colors[i3 + 2] = 0;
      } else if (colorChoice < 0.7) {
        // 紅色
        colors[i3] = 1;
        colors[i3 + 1] = 0.2;
        colors[i3 + 2] = 0.2;
      } else {
        // 白色
        colors[i3] = 1;
        colors[i3 + 1] = 1;
        colors[i3 + 2] = 1;
      }
      
      sizes[i] = Math.random() * 0.15 + 0.05;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    return { positions, colors, sizes, phases };
  }, [count]);
  
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    const geometry = pointsRef.current.geometry;
    const sizeAttr = geometry.attributes.size;
    
    for (let i = 0; i < count; i++) {
      // 使用 noise 創造有機的閃爍
      const noiseVal = noise3D(
        phases[i],
        time * 2,
        i * 0.1
      );
      
      // 閃爍效果
      const twinkle = Math.sin(time * 3 + phases[i]) * 0.5 + 0.5;
      const flicker = Math.max(0, noiseVal) * 0.5 + 0.5;
      
      sizeAttr.array[i] = sizes[i] * (0.5 + twinkle * flicker);
    }
    
    sizeAttr.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// 壁爐的火花粒子
export function FireSparkles({ count = 50 }) {
  const pointsRef = useRef();
  const noise3D = useMemo(() => createNoise3D(), []);
  
  const particleData = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const maxLifetimes = new Float32Array(count);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // 初始化
      resetParticle(i, positions, velocities, lifetimes, maxLifetimes, sizes);
    }
    
    return { positions, velocities, lifetimes, maxLifetimes, sizes };
  }, [count]);
  
  function resetParticle(i, positions, velocities, lifetimes, maxLifetimes, sizes) {
    const i3 = i * 3;
    
    // 壁爐位置 (根據 Fireplace.jsx 的位置)
    positions[i3] = (Math.random() - 0.5) * 1.5 + 7; // x
    positions[i3 + 1] = Math.random() * 0.5 + 0.5; // y 從火焰底部開始
    positions[i3 + 2] = (Math.random() - 0.5) * 0.5 - 3; // z
    
    // 向上的速度，帶有隨機擴散
    velocities[i3] = (Math.random() - 0.5) * 0.02;
    velocities[i3 + 1] = Math.random() * 0.05 + 0.03;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;
    
    maxLifetimes[i] = Math.random() * 2 + 1;
    lifetimes[i] = Math.random() * maxLifetimes[i];
    sizes[i] = Math.random() * 0.08 + 0.02;
  }
  
  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    
    const { positions, velocities, lifetimes, maxLifetimes, sizes } = particleData;
    const geometry = pointsRef.current.geometry;
    const posAttr = geometry.attributes.position;
    const sizeAttr = geometry.attributes.size;
    const time = state.clock.getElapsedTime();
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // 更新生命週期
      lifetimes[i] += delta;
      
      if (lifetimes[i] >= maxLifetimes[i]) {
        resetParticle(i, positions, velocities, lifetimes, maxLifetimes, sizes);
      }
      
      // 添加噪聲擾動
      const noiseX = noise3D(positions[i3] * 0.5, time, i) * 0.01;
      const noiseZ = noise3D(i, positions[i3 + 1] * 0.5, time) * 0.01;
      
      // 更新位置
      positions[i3] += velocities[i3] + noiseX;
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2] + noiseZ;
      
      // 更新顯示
      posAttr.array[i3] = positions[i3];
      posAttr.array[i3 + 1] = positions[i3 + 1];
      posAttr.array[i3 + 2] = positions[i3 + 2];
      
      // 大小隨生命週期變化
      const lifeRatio = lifetimes[i] / maxLifetimes[i];
      sizeAttr.array[i] = sizes[i] * (1 - lifeRatio) * (0.5 + Math.random() * 0.5);
    }
    
    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particleData.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={particleData.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ff6600"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// 飄浮的魔法光點
export function FloatingLights({ count = 30 }) {
  const groupRef = useRef();
  const noise3D = useMemo(() => createNoise3D(), []);
  
  const lights = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      initialPos: [
        (Math.random() - 0.5) * 30,
        Math.random() * 15 + 2,
        (Math.random() - 0.5) * 20 - 5,
      ],
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
      speed: Math.random() * 0.5 + 0.2,
      size: Math.random() * 0.2 + 0.1,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count]);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    groupRef.current.children.forEach((mesh, i) => {
      const light = lights[i];
      
      // 使用 noise 創造有機的浮動路徑
      const noiseX = noise3D(time * light.speed * 0.3, light.phase, 0) * 3;
      const noiseY = noise3D(light.phase, time * light.speed * 0.2, 1) * 2;
      const noiseZ = noise3D(0, light.phase, time * light.speed * 0.25) * 2;
      
      mesh.position.x = light.initialPos[0] + noiseX;
      mesh.position.y = light.initialPos[1] + noiseY;
      mesh.position.z = light.initialPos[2] + noiseZ;
      
      // 脈動效果
      const pulse = Math.sin(time * 2 + light.phase) * 0.3 + 0.7;
      mesh.scale.setScalar(light.size * pulse);
      
      // 顏色緩慢變化
      const hue = (time * 0.02 + i * 0.1) % 1;
      mesh.material.color.setHSL(hue, 0.7, 0.6);
      mesh.material.emissive.setHSL(hue, 0.9, 0.3);
    });
  });
  
  return (
    <group ref={groupRef}>
      {lights.map((light) => (
        <mesh key={light.id} position={light.initialPos}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color={light.color}
            emissive={light.color}
            emissiveIntensity={2}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

// 導出所有粒子效果
export function MagicParticles() {
  return (
    <>
      <TreeSparkles count={80} />
      <FireSparkles count={40} />
      <FloatingLights count={25} />
    </>
  );
}

export default MagicParticles;
