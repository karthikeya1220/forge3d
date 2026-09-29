"use client";

import {
  ContactShadows,
  Environment,
  Grid,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { fitTransform } from "@/lib/3d/normalize";

const DEFAULT_CAMERA: [number, number, number] = [2.6, 1.9, 3.4];
const DEFAULT_TARGET: [number, number, number] = [0, 0.55, 0];

function Model({ url, onLoaded }: { url: string; onLoaded?: () => void }) {
  const { scene } = useGLTF(url);
  const onLoadedRef = useRef(onLoaded);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  const root = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const { scale, offset } = fitTransform(box);
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.scale.setScalar(scale);
    wrapper.position.set(offset[0], offset[1], offset[2]);
    return wrapper;
  }, [scene]);

  useEffect(() => {
    onLoadedRef.current?.();
    return () => {
      // Release the cached GLTF so swapping models doesn't leak GPU memory.
      useGLTF.clear(url);
    };
  }, [url]);

  return <primitive object={root} />;
}

function CameraReset({
  signal,
}: {
  signal: number;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as
    | { target: THREE.Vector3; update: () => void }
    | null;

  useEffect(() => {
    if (signal === 0) return;
    camera.position.set(...DEFAULT_CAMERA);
    camera.lookAt(...DEFAULT_TARGET);
    if (controls) {
      controls.target.set(...DEFAULT_TARGET);
      controls.update();
    }
  }, [signal, camera, controls]);

  return null;
}

class SceneErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[viewer] model failed to load:", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface ModelCanvasProps {
  modelUrl: string | null;
  resetSignal: number;
  onModelError?: () => void;
}

export default function ModelCanvas({
  modelUrl,
  resetSignal,
  onModelError,
}: ModelCanvasProps) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: DEFAULT_CAMERA, fov: 40, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      aria-label="3D model viewport"
    >
      <color attach="background" args={["#0c0d10"]} />

      <ambientLight intensity={0.4} />
      <directionalLight
        castShadow
        position={[4, 6, 3]}
        intensity={2.4}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      <directionalLight position={[-5, 3, -2]} intensity={0.7} color="#b9c9ff" />
      <directionalLight position={[0, -1.5, -4]} intensity={0.35} color="#ffd9b8" />

      <Environment resolution={256}>
        <Lightformer
          intensity={2.2}
          position={[0, 4, -3]}
          scale={[10, 5, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={1.4}
          position={[-5, 2, 2]}
          rotation-y={Math.PI / 2}
          scale={[8, 4, 1]}
          color="#cdd8ff"
        />
        <Lightformer
          intensity={1.1}
          position={[5, 2, 2]}
          rotation-y={-Math.PI / 2}
          scale={[8, 4, 1]}
          color="#ffe2c4"
        />
      </Environment>

      <Grid
        position={[0, -0.002, 0]}
        args={[24, 24]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1e222a"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#313845"
        fadeDistance={20}
        fadeStrength={1.5}
        infiniteGrid
      />
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.55}
        scale={9}
        blur={2.4}
        far={4}
        resolution={512}
        color="#000000"
      />

      {modelUrl ? (
        <SceneErrorBoundary onError={() => onModelError?.()}>
          <Model url={modelUrl} />
        </SceneErrorBoundary>
      ) : null}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan
        panSpeed={0.8}
        rotateSpeed={0.8}
        zoomSpeed={0.9}
        minDistance={1.5}
        maxDistance={14}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2 + 0.15}
        target={DEFAULT_TARGET}
      />
      <CameraReset signal={resetSignal} />
    </Canvas>
  );
}
