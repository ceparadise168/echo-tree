import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 極光著色器 - 使用 noise 函式創造流動的極光效果
const auroraVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const auroraFragmentShader = `
  uniform float uTime;
  uniform float uColorMix;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  // 分形布朗運動 (FBM)
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for(int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }
  
  void main() {
    vec2 uv = vUv;
    
    // 創造多層次的波動
    float time = uTime * 0.15;
    
    // 主要的波動形狀
    float wave1 = sin(uv.x * 3.0 + time) * 0.5 + 0.5;
    float wave2 = sin(uv.x * 5.0 - time * 1.3) * 0.3 + 0.5;
    float wave3 = sin(uv.x * 7.0 + time * 0.7) * 0.2 + 0.5;
    
    // 使用 FBM 創造流動效果
    float noise1 = fbm(vec2(uv.x * 2.0 + time * 0.5, uv.y * 3.0));
    float noise2 = fbm(vec2(uv.x * 3.0 - time * 0.3, uv.y * 2.0 + time * 0.2));
    
    // 結合波動和噪聲
    float pattern = (wave1 + wave2 + wave3) / 3.0;
    pattern += noise1 * 0.3 + noise2 * 0.2;
    
    // 垂直漸變 - 極光在上方更亮
    float verticalFade = pow(uv.y, 0.8);
    
    // 水平漸變 - 邊緣淡化
    float horizontalFade = 1.0 - pow(abs(uv.x - 0.5) * 2.0, 2.0);
    
    // 創造簾幕效果
    float curtain = sin(uv.x * 20.0 + noise1 * 5.0 + time) * 0.5 + 0.5;
    curtain = pow(curtain, 3.0);
    
    // 顏色混合 - 根據 uColorMix 在不同色系間切換
    vec3 colorA = mix(uColor1, uColor2, pattern);
    vec3 colorB = mix(uColor2, uColor3, 1.0 - pattern);
    vec3 finalColor = mix(colorA, colorB, uColorMix);
    
    // 添加亮度變化
    float brightness = pattern * verticalFade * horizontalFade;
    brightness *= 0.6 + curtain * 0.4;
    brightness *= 0.8 + noise2 * 0.4;
    
    // 底部完全透明
    float bottomFade = smoothstep(0.0, 0.3, uv.y);
    
    float alpha = brightness * bottomFade * 0.7;
    
    gl_FragColor = vec4(finalColor * (1.0 + brightness * 0.5), alpha);
  }
`;

// 顏色主題 - 會隨時間在這些主題間切換
const colorThemes = [
  { // 經典綠色極光
    color1: new THREE.Color('#00ff88'),
    color2: new THREE.Color('#00ffcc'),
    color3: new THREE.Color('#88ffaa'),
  },
  { // 紫粉色極光
    color1: new THREE.Color('#ff00ff'),
    color2: new THREE.Color('#ff88ff'),
    color3: new THREE.Color('#cc44ff'),
  },
  { // 青藍色極光
    color1: new THREE.Color('#00ccff'),
    color2: new THREE.Color('#00ffff'),
    color3: new THREE.Color('#44aaff'),
  },
  { // 橘紅色極光 (罕見)
    color1: new THREE.Color('#ff4400'),
    color2: new THREE.Color('#ff8844'),
    color3: new THREE.Color('#ffaa00'),
  },
];

export function Aurora() {
  const meshRef = useRef();
  const materialRef = useRef();
  
  // 追蹤顏色主題切換
  const colorStateRef = useRef({
    currentTheme: 0,
    nextTheme: 1,
    transitionProgress: 0,
    lastThemeChange: 0,
    themeDuration: 15, // 每個主題持續秒數
    transitionDuration: 3, // 過渡時間
  });
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColorMix: { value: 0 },
    uColor1: { value: colorThemes[0].color1.clone() },
    uColor2: { value: colorThemes[0].color2.clone() },
    uColor3: { value: colorThemes[0].color3.clone() },
  }), []);
  
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = elapsed;
      
      // 顏色主題切換邏輯
      const colorState = colorStateRef.current;
      const timeSinceChange = elapsed - colorState.lastThemeChange;
      
      if (timeSinceChange > colorState.themeDuration) {
        // 開始過渡到下一個主題
        colorState.lastThemeChange = elapsed;
        colorState.currentTheme = colorState.nextTheme;
        // 隨機選擇下一個主題 (不重複)
        let next;
        do {
          next = Math.floor(Math.random() * colorThemes.length);
        } while (next === colorState.currentTheme);
        colorState.nextTheme = next;
        colorState.transitionProgress = 0;
      }
      
      // 計算過渡進度
      const transitionStart = colorState.themeDuration - colorState.transitionDuration;
      if (timeSinceChange > transitionStart) {
        colorState.transitionProgress = 
          (timeSinceChange - transitionStart) / colorState.transitionDuration;
      }
      
      // 平滑插值顏色
      const t = Math.min(colorState.transitionProgress, 1);
      const smoothT = t * t * (3 - 2 * t); // smoothstep
      
      const currentColors = colorThemes[colorState.currentTheme];
      const nextColors = colorThemes[colorState.nextTheme];
      
      materialRef.current.uniforms.uColor1.value.lerpColors(
        currentColors.color1, nextColors.color1, smoothT
      );
      materialRef.current.uniforms.uColor2.value.lerpColors(
        currentColors.color2, nextColors.color2, smoothT
      );
      materialRef.current.uniforms.uColor3.value.lerpColors(
        currentColors.color3, nextColors.color3, smoothT
      );
      
      // 動態顏色混合
      materialRef.current.uniforms.uColorMix.value = 
        Math.sin(elapsed * 0.1) * 0.5 + 0.5;
    }
    
    // 輕微的搖擺動畫
    if (meshRef.current) {
      meshRef.current.rotation.y = elapsed * 0.02; // 緩慢旋轉
    }
  });
  
  return (
    <mesh
      ref={meshRef}
      position={[0, 15, 0]}
      rotation={[0, 0, 0]}
    >
      {/* 使用圓柱幾何體作為天幕，從內部看 */}
      <cylinderGeometry args={[50, 50, 40, 64, 1, true]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={auroraVertexShader}
        fragmentShader={auroraFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default Aurora;
