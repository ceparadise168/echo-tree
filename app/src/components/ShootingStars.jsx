import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const METEOR_COUNT = 20;
const TRAIL_LENGTH = 15;

export function ShootingStars({ trigger }) {
  const linesRef = useRef();
  
  // 儲存流星的狀態
  const meteors = useMemo(() => {
    return new Array(METEOR_COUNT).fill().map(() => ({
      active: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      speed: 0,
      color: new THREE.Color()
    }));
  }, []);

  // 初始化幾何體
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    // 每個流星一條線，每條線 2 個頂點 (起點和終點)
    const positions = new Float32Array(METEOR_COUNT * 2 * 3);
    const colors = new Float32Array(METEOR_COUNT * 2 * 3);
    const opacities = new Float32Array(METEOR_COUNT * 2); // 用於透明度

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
    return geo;
  }, []);

  // 觸發流星
  useEffect(() => {
    if (!trigger) return;

    // 每次觸發發射 3-5 顆流星
    const launchCount = 3 + Math.floor(Math.random() * 3);
    let launched = 0;

    for (let i = 0; i < METEOR_COUNT; i++) {
      if (!meteors[i].active) {
        const m = meteors[i];
        m.active = true;
        m.life = 1.0;
        
        // 隨機起始位置 (調整為視野可見範圍)
        m.position.set(
          (Math.random() - 0.5) * 40, // X: -20 to 20
          5 + Math.random() * 15,     // Y: 5 to 20 (更低，確保在視野內)
          (Math.random() - 0.5) * 20  // Z: -10 to 10 (避免被霧氣遮擋)
        );

        // 隨機速度
        m.speed = 0.5 + Math.random() * 0.5;
        m.velocity.set(
          (Math.random() - 0.5) * 0.3, // 輕微左右偏移
          -1.0,                        // 主要向下
          (Math.random() - 0.5) * 0.2  // 輕微前後偏移
        ).normalize().multiplyScalar(m.speed);

        // 隨機顏色 (增加亮度)
        const colorType = Math.random();
        if (colorType > 0.6) m.color.setHex(0xFFD700); // 金色
        else if (colorType > 0.3) m.color.setHex(0xFFFFFF); // 白色
        else m.color.setHex(0x00FFFF); // 青色 (比天藍更亮)

        launched++;
        if (launched >= launchCount) break;
      }
    }
  }, [trigger, meteors]);

  useFrame(() => {
    if (!linesRef.current) return;

    const positions = linesRef.current.geometry.attributes.position.array;
    const colors = linesRef.current.geometry.attributes.color.array;
    // 我們需要自定義材質來處理頂點透明度，或者簡單地將無效線段移到視野外
    
    let activeCount = 0;

    for (let i = 0; i < METEOR_COUNT; i++) {
      const m = meteors[i];
      const idx = i * 2 * 3; // 每個流星 2 個頂點，每個頂點 3 個座標

      if (m.active) {
        // 更新位置
        m.position.add(m.velocity);
        m.life -= 0.015; // 生命週期遞減

        // 計算尾巴位置 (反向延伸)
        const tailPos = m.position.clone().sub(
          m.velocity.clone().normalize().multiplyScalar(TRAIL_LENGTH * m.life) // 尾巴隨生命週期變短
        );

        // 更新頂點位置
        // 頭部
        positions[idx] = m.position.x;
        positions[idx + 1] = m.position.y;
        positions[idx + 2] = m.position.z;
        
        // 尾部
        positions[idx + 3] = tailPos.x;
        positions[idx + 4] = tailPos.y;
        positions[idx + 5] = tailPos.z;

        // 更新顏色
        m.color.toArray(colors, idx);     // 頭部顏色
        m.color.toArray(colors, idx + 3); // 尾部顏色

        // 檢查是否結束
        if (m.life <= 0 || m.position.y < -20) {
          m.active = false;
        }
        activeCount++;
      } else {
        // 將不活躍的流星藏起來
        positions[idx] = 0;
        positions[idx + 1] = -1000;
        positions[idx + 2] = 0;
        positions[idx + 3] = 0;
        positions[idx + 4] = -1000;
        positions[idx + 5] = 0;
      }
    }

    if (activeCount > 0 || linesRef.current.visible) {
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.attributes.color.needsUpdate = true;
      linesRef.current.visible = true;
    }
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial 
        vertexColors 
        transparent 
        opacity={1.0} 
        linewidth={2} // 注意：WebGL 中 linewidth 通常限制為 1
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}
