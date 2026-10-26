/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {
  Character,
  SmartObject,
  layoutNonOverlappingBubbles,
  formatTaskDuration,
} from '../game/simulation';
import {
  buildHouseEnvironment,
  SceneHandles,
  WallCutawayMode,
  WeatherCondition,
} from '../game/sceneBuilder';
import {
  WorldBlueprint,
  BuildingPartDefinition,
  BuildToolMode,
  snapToLotGrid,
} from '../game/worldBuilder';
import { SobelPencilShader, PENCIL_OUTLINE_SHADER_PATH } from '../game/sobelPencilPass';
import { FloorLevel, getFloorCameraTargetY } from '../game/houseAgent';
import pencilOutlineShaderSource from '../shaders/PencilOutline.shader?raw';

interface Viewport3DProps {
  characters: Character[];
  smartObjects: SmartObject[];
  isDarkMode: boolean;
  cutawayMode: WallCutawayMode;
  showGrid: boolean;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  isScreensaverMode: boolean;
  showPencilOutline?: boolean;
  expansionLevel?: number;
  hasUpstairs?: boolean;
  hasBasement?: boolean;
  activeFloor?: FloorLevel;
  firstPersonCharId?: string | null;
  weatherCondition?: WeatherCondition;
  roomWallpapers?: Record<string, string>;
  roomCarpets?: Record<string, string>;
  openConceptKitchen?: boolean;
  openConceptLiving?: boolean;
  worldBlueprint?: WorldBlueprint;
  isWorldBuilderMode?: boolean;
  selectedBuildPart?: BuildingPartDefinition | null;
  buildToolMode?: BuildToolMode;
  buildPartRotationY?: number;
  onGridInteractAt?: (pos: { x: number; y: number; z: number }) => void;
  activeSpeakerId?: string | null;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  characters,
  smartObjects,
  isDarkMode,
  cutawayMode,
  showGrid,
  selectedCharacterId,
  onSelectCharacter,
  isScreensaverMode,
  showPencilOutline = true,
  expansionLevel = 2,
  hasUpstairs = true,
  hasBasement = true,
  activeFloor = 'MAIN',
  firstPersonCharId = null,
  weatherCondition = 'CLEAR',
  roomWallpapers = {},
  roomCarpets = {},
  openConceptKitchen = false,
  openConceptLiving = false,
  worldBlueprint,
  isWorldBuilderMode = false,
  selectedBuildPart = null,
  buildToolMode = 'PLACE',
  buildPartRotationY = 0,
  onGridInteractAt,
  activeSpeakerId = null,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const handlesRef = useRef<SceneHandles | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const pencilPassRef = useRef<ShaderPass | null>(null);

  // Store props in refs for lossless 60fps render loop
  const charsRef = useRef(characters);
  charsRef.current = characters;

  const smartObjectsRef = useRef(smartObjects);
  smartObjectsRef.current = smartObjects;

  const cutawayRef = useRef(cutawayMode);
  cutawayRef.current = cutawayMode;

  const selectedCharIdRef = useRef(selectedCharacterId);
  selectedCharIdRef.current = selectedCharacterId;

  const isScreensaverRef = useRef(isScreensaverMode);
  isScreensaverRef.current = isScreensaverMode;

  const showPencilRef = useRef(showPencilOutline);
  showPencilRef.current = showPencilOutline;

  const firstPersonCharIdRef = useRef(firstPersonCharId);
  firstPersonCharIdRef.current = firstPersonCharId;

  const weatherRef = useRef<WeatherCondition>(weatherCondition);
  weatherRef.current = weatherCondition;

  const isBuilderModeRef = useRef(isWorldBuilderMode);
  isBuilderModeRef.current = isWorldBuilderMode;

  const selectedBuildPartRef = useRef(selectedBuildPart);
  selectedBuildPartRef.current = selectedBuildPart;

  const buildToolModeRef = useRef(buildToolMode);
  buildToolModeRef.current = buildToolMode;

  const buildRotationRef = useRef(buildPartRotationY);
  buildRotationRef.current = buildPartRotationY;

  const onGridInteractRef = useRef(onGridInteractAt);
  onGridInteractRef.current = onGridInteractAt;

  const activeSpeakerIdRef = useRef(activeSpeakerId);
  activeSpeakerIdRef.current = activeSpeakerId;

  const activeFloorRef = useRef<FloorLevel>(activeFloor);
  activeFloorRef.current = activeFloor;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Camera setup (Classic Sims Isometric / Angled Perspective)
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.25, 250);
    camera.position.set(24, 28, 34);
    camera.lookAt(0, 1.5, 0);
    cameraRef.current = camera;

    // 2. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.appendChild(renderer.domElement);

    // 3. Environment & Studio Lighting
    const handles = buildHouseEnvironment(smartObjects, characters, isDarkMode, expansionLevel);
    handlesRef.current = handles;
    const scene = handles.scene;

    // Apply initial home styling & multi-story state
    handles.applyHomeStyling(
      roomWallpapers,
      roomCarpets,
      openConceptKitchen,
      openConceptLiving
    );
    handles.setMultiStoryState?.({
      hasUpstairs: hasUpstairs || expansionLevel >= 2,
      hasBasement,
    });

    // 4. Post-Processing Pipeline: 1-Pixel Sobel Pencil-Outline Effect (src/shaders/PencilOutline.shader)
    const composer = new EffectComposer(renderer);
    composer.setSize(width, height);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const pencilPass = new ShaderPass(SobelPencilShader);
    const pixelRatio = renderer.getPixelRatio();
    pencilPass.uniforms.resolution.value.set(width * pixelRatio, height * pixelRatio);
    pencilPass.uniforms.outlineThickness.value = 1.0;
    pencilPass.uniforms.outlineStrength.value = 1.0;
    pencilPass.uniforms.edgeThreshold.value = isDarkMode ? 0.09 : 0.11;
    pencilPass.uniforms.paperTint.value = isDarkMode ? 0.02 : 0.06;
    pencilPass.uniforms.enabled.value = showPencilRef.current;
    composer.addPass(pencilPass);

    composerRef.current = composer;
    pencilPassRef.current = pencilPass;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm Sun Key Light
    const sunLight = new THREE.DirectionalLight(0xfffbeb, isDarkMode ? 0.8 : 2.2);
    sunLight.position.set(20, 35, 18);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 80;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    // Cool Sky Fill Light
    const hemiLight = new THREE.HemisphereLight(
      isDarkMode ? 0x312e81 : 0xdbeafe,
      isDarkMode ? 0x111827 : 0x4b5563,
      isDarkMode ? 0.6 : 1.2
    );
    scene.add(hemiLight);

    // 5. Interactive Orbit & Pan Controls (STRICTLY DISABLED during First-Person Viewpoint Mode)
    let isDragging = false;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let spherical = {
      radius: 44,
      theta: Math.PI / 4,
      phi: Math.PI / 3.4,
    };
    let cameraTarget = new THREE.Vector3(0, 1.5, 0);
    let fpLookTarget = new THREE.Vector3(0, 1.65, 5);
    let screensaverTargetCharId: string | null = null;
    let screensaverSwitchTimer = 0;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const lotGroundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const groundHitVec = new THREE.Vector3();

    const onPointerDown = (e: PointerEvent) => {
      if (firstPersonCharIdRef.current || isScreensaverRef.current) return;
      if (e.button === 0 || e.pointerType === 'touch') {
        isDragging = true;
        pointerDownX = e.clientX;
        pointerDownY = e.clientY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (firstPersonCharIdRef.current || isScreensaverRef.current) return;

      // Update 3D Build Cursor when hovering over the lot grid in World Builder Mode
      if (isBuilderModeRef.current && handlesRef.current) {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(lotGroundPlane, groundHitVec)) {
          const snapped = snapToLotGrid(groundHitVec.x, groundHitVec.z, 0.5);
          handlesRef.current.updateBuildCursor(
            { x: snapped.x, y: 0, z: snapped.z },
            selectedBuildPartRef.current,
            buildRotationRef.current,
            buildToolModeRef.current,
            true
          );
        }
      } else if (handlesRef.current) {
        handlesRef.current.updateBuildCursor(null, null, 0, 'PLACE', false);
      }

      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      spherical.theta -= dx * 0.008;
      spherical.phi = Math.max(0.25, Math.min(Math.PI / 2.1, spherical.phi - dy * 0.008));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (firstPersonCharIdRef.current || isScreensaverRef.current) return;
      e.preventDefault();
      spherical.radius = Math.max(10, Math.min(85, spherical.radius + e.deltaY * 0.035));
    };

    const onClick = (e: MouseEvent) => {
      if (firstPersonCharIdRef.current || isScreensaverRef.current) return;
      // Ignore camera orbit drags (> 6px movement)
      if (Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // If in World Builder Mode, click places part or uses Sledgehammer on the grid
      if (isBuilderModeRef.current && onGridInteractRef.current) {
        if (raycaster.ray.intersectPlane(lotGroundPlane, groundHitVec)) {
          const snapped = snapToLotGrid(groundHitVec.x, groundHitVec.z, 0.5);
          onGridInteractRef.current({ x: snapped.x, y: 0, z: snapped.z });
          return;
        }
      }

      const intersects = raycaster.intersectObjects(handles.charactersGroup.children, true);
      if (intersects.length > 0) {
        let parent: THREE.Object3D | null = intersects[0].object;
        while (parent && parent.parent !== handles.charactersGroup) {
          parent = parent.parent;
        }
        if (parent && parent.name) {
          onSelectCharacter(parent.name);
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('click', onClick);

    // 6. Lossless Animation Loop with Software-WebGL Pacing, First-Person POV & Screensaver Auto-Director
    let animId = 0;
    let clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext | null;
      if (!gl || typeof gl.fenceSync !== 'function') {
        animId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          animId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          animId = window.setTimeout(cb, 80);
        }
      };
      animId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Update characters & weather first so rigs have latest positions & rotations
      handles.updateCharacters(
        charsRef.current,
        delta,
        smartObjectsRef.current,
        activeSpeakerIdRef.current
      );
      handles.updateWeather(weatherRef.current, delta);

      const fpId = firstPersonCharIdRef.current;
      const fpChar = fpId ? charsRef.current.find((c) => c.id === fpId && c.onGrid) : null;

      // Toggle character mesh visibility so the camera doesn't clip inside the active FP toon's head
      handles.charactersGroup.children.forEach((rig) => {
        rig.visible = rig.name !== (fpChar ? fpChar.id : '');
      });

      if (fpChar) {
        // FIRST-PERSON VIEWPOINT ("ALONG FOR THE RIDE" - ZERO USER CONTROL)
        const rig = handles.charactersGroup.getObjectByName(fpChar.id);
        const bodyGroup = rig?.getObjectByName('BodyGroup');
        const hScale = fpChar.boneScale?.height || 1.0;
        const eyeHeight = (fpChar.pos.y || 0) + 1.65 * hScale;

        const posX = rig ? rig.position.x : fpChar.pos.x;
        const posZ = rig ? rig.position.z : fpChar.pos.z;
        const yaw = bodyGroup ? bodyGroup.rotation.y : clock.getElapsedTime() * 0.12;

        const headBob = Math.sin(clock.getElapsedTime() * 2.2) * 0.018;
        const desiredEyePos = new THREE.Vector3(posX, eyeHeight + headBob, posZ);
        camera.position.lerp(desiredEyePos, Math.min(1, delta * 9.0));

        const autonomousGazeSweep = Math.sin(clock.getElapsedTime() * 0.35) * 0.2;
        const forwardX = Math.sin(yaw + autonomousGazeSweep);
        const forwardZ = Math.cos(yaw + autonomousGazeSweep);
        const desiredLook = new THREE.Vector3(
          posX + forwardX * 6.0,
          eyeHeight - 0.12 + Math.cos(clock.getElapsedTime() * 0.5) * 0.06,
          posZ + forwardZ * 6.0
        );
        fpLookTarget.lerp(desiredLook, Math.min(1, delta * 6.0));
        camera.lookAt(fpLookTarget);

        handles.updateCutaways('WALLS_UP', camera.position);
      } else {
        // THIRD-PERSON / SCREENSAVER CAMERA
        if (isScreensaverRef.current && !isDragging) {
          screensaverSwitchTimer -= delta;
          const onGridChars = charsRef.current.filter((c) => c.onGrid);

          if (
            screensaverSwitchTimer <= 0 ||
            !screensaverTargetCharId ||
            !onGridChars.some((c) => c.id === screensaverTargetCharId)
          ) {
            if (onGridChars.length > 0) {
              const randomChar = onGridChars[Math.floor(Math.random() * onGridChars.length)];
              screensaverTargetCharId = randomChar.id;
            }
            screensaverSwitchTimer = 18 + Math.random() * 10;
          }

          const followedChar =
            onGridChars.find((c) => c.id === screensaverTargetCharId) || onGridChars[0];

          spherical.radius = THREE.MathUtils.lerp(spherical.radius, 13.5, delta * 1.6);
          spherical.phi = THREE.MathUtils.lerp(spherical.phi, Math.PI / 3.1, delta * 1.5);
          spherical.theta += delta * 0.08;

          if (followedChar) {
            const rig = handles.charactersGroup.getObjectByName(followedChar.id);
            const targetX = rig ? rig.position.x : followedChar.pos.x;
            const targetY = (rig ? rig.position.y : followedChar.pos.y || 0) + 1.35;
            const targetZ = rig ? rig.position.z : followedChar.pos.z;
            cameraTarget.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 2.2);
          }
        } else {
          if (spherical.radius < 18 && !isDragging) {
            spherical.radius = THREE.MathUtils.lerp(spherical.radius, 42, delta * 2.0);
          }
          const targetFloorY = getFloorCameraTargetY(activeFloorRef.current);
          cameraTarget.lerp(new THREE.Vector3(0, targetFloorY, 0), delta * 2.5);
        }

        const sinPhiRadius = spherical.radius * Math.sin(spherical.phi);
        camera.position.x = cameraTarget.x + sinPhiRadius * Math.sin(spherical.theta);
        camera.position.y = cameraTarget.y + spherical.radius * Math.cos(spherical.phi);
        camera.position.z = cameraTarget.z + sinPhiRadius * Math.cos(spherical.theta);
        camera.lookAt(cameraTarget);

        handles.updateCutaways(cutawayRef.current, camera.position);
      }

      if (showPencilRef.current && composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        animId = requestAnimationFrame(tick);
      }
    };

    tick();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      pencilPass.uniforms.resolution.value.set(w * pr, h * pr);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(animId);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      renderer.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, [isDarkMode]);

  // Sync cutaways, grid toggle, pencil outline pass, second floor expansion, home styling, World Blueprint, and SmartObjects
  useEffect(() => {
    if (handlesRef.current && cameraRef.current) {
      if (worldBlueprint) {
        handlesRef.current.applyWorldBlueprint(worldBlueprint);
      }
      handlesRef.current.syncSmartObjects(smartObjects);
      handlesRef.current.updateCutaways(cutawayMode, cameraRef.current.position);
      handlesRef.current.toggleGrid(showGrid || isWorldBuilderMode);
      handlesRef.current.setExpansionLevel?.(expansionLevel);
      handlesRef.current.setMultiStoryState?.({
        hasUpstairs: (hasUpstairs || expansionLevel >= 2) && activeFloor === 'UPSTAIRS',
        hasBasement,
      });
      handlesRef.current.applyHomeStyling(
        roomWallpapers,
        roomCarpets,
        openConceptKitchen,
        openConceptLiving
      );
      if (!isWorldBuilderMode) {
        handlesRef.current.updateBuildCursor(null, null, 0, 'PLACE', false);
      }
    }
    if (pencilPassRef.current) {
      pencilPassRef.current.uniforms.enabled.value = showPencilOutline;
    }
  }, [
    cutawayMode,
    showGrid,
    showPencilOutline,
    expansionLevel,
    hasUpstairs,
    hasBasement,
    activeFloor,
    roomWallpapers,
    roomCarpets,
    openConceptKitchen,
    openConceptLiving,
    worldBlueprint,
    smartObjects,
    isWorldBuilderMode,
  ]);

  // Single-speaker turn & non-overlapping speech bubble layout
  const activeSpeechBubbles = React.useMemo(() => {
    if (isScreensaverMode) return [];
    const candidates = characters.filter(
      (c) => c.onGrid && Boolean(c.selfTalk) && c.id !== firstPersonCharId
    );
    if (candidates.length === 0) return [];

    // Enforce single active speaker turn: prioritize activeSpeakerId, then selectedCharacterId
    const sorted = [...candidates].sort((a, b) => {
      const aSpeaking = a.id === activeSpeakerId ? 1 : 0;
      const bSpeaking = b.id === activeSpeakerId ? 1 : 0;
      if (bSpeaking !== aSpeaking) return bSpeaking - aSpeaking;
      const aSelected = a.id === selectedCharacterId ? 1 : 0;
      const bSelected = b.id === selectedCharacterId ? 1 : 0;
      return bSelected - aSelected;
    });

    // Show up to 2 non-overlapping speech bubbles so both speaker and conversational partner are visible
    const activeTurnList = activeSpeakerId
      ? sorted.slice(0, 2)
      : sorted.slice(0, 2);

    const laidOut = layoutNonOverlappingBubbles(
      activeTurnList.map((c, idx) => {
        const rawLeft = 50 + c.pos.x * 2.2 - c.pos.z * 0.9;
        const rawTop = 48 - c.pos.y * 3.5 + c.pos.z * 1.4;
        const priority =
          (c.id === activeSpeakerId ? 100 : 0) +
          (c.id === selectedCharacterId ? 50 : 0) -
          idx;
        return {
          id: c.id,
          rawLeftPct: Math.max(12, Math.min(88, rawLeft)),
          rawTopPct: Math.max(16, Math.min(82, rawTop)),
          priority,
        };
      })
    );

    return laidOut
      .map((item, idx) => {
        const char = activeTurnList.find((c) => c.id === item.id);
        if (!char) return null;
        return {
          char,
          left: item.leftPct,
          top: item.topPct,
          stackOffset: 0,
          clusterIndex: idx,
          isSelected: char.id === selectedCharacterId,
          isSpeaking: char.id === activeSpeakerId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [characters, selectedCharacterId, firstPersonCharId, activeSpeakerId, isScreensaverMode]);

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      data-testid="viewport-3d"
      data-camera-mode={isScreensaverMode ? 'FOLLOW_TOONS' : 'USER_CONTROLLED'}
    >
      <div
        ref={mountRef}
        className={`w-full h-full ${
          firstPersonCharId || isScreensaverMode
            ? 'cursor-default'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Viewport3D 1-Pixel Sobel Graphite Pencil-Sketch Overlay (src/shaders/PencilOutline.shader) */}
      {showPencilOutline && (
        <div
          data-testid="pencil-outline-overlay"
          data-shader-path={PENCIL_OUTLINE_SHADER_PATH}
          data-outline-width="1px"
          data-godot4-shader-loaded={pencilOutlineShaderSource.includes('shader_type canvas_item') ? 'true' : 'false'}
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            backgroundImage: isDarkMode
              ? 'radial-gradient(circle at 50% 50%, transparent 65%, rgba(15, 23, 42, 0.26) 100%), repeating-linear-gradient(135deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 5px)'
              : 'radial-gradient(circle at 50% 50%, transparent 68%, rgba(34, 35, 40, 0.14) 100%), repeating-linear-gradient(135deg, rgba(34, 35, 40, 0.022) 0px, rgba(34, 35, 40, 0.022) 1px, transparent 1px, transparent 5px)',
          }}
        />
      )}

      {/* Non-Overlapping Single-Turn Speech Bubble */}
      {!isScreensaverMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" data-testid="speech-bubbles-layer">
          {activeSpeechBubbles.map(
            ({ char, left, top, stackOffset, clusterIndex, isSelected, isSpeaking }) => (
              <div
                key={char.id}
              data-testid={`speech-bubble-${char.id}`}
              className={`absolute transition-all duration-300 transform -translate-x-1/2 -translate-y-full ${
                isSelected || isSpeaking ? 'z-30 scale-105' : 'z-20 hover:z-40'
              }`}
              style={{
                left: `${left}%`,
                top: `calc(${top}% - ${stackOffset}px)`,
              }}
            >
              <div
                onClick={() => onSelectCharacter(char.id)}
                className={`relative max-w-xs px-3.5 py-2 rounded-2xl shadow-xl border text-xs pointer-events-auto cursor-pointer hover:scale-105 transition-all ${
                  isSpeaking
                    ? 'ring-2 ring-emerald-500 shadow-emerald-500/25'
                    : isSelected
                    ? 'ring-2 ring-indigo-500 shadow-indigo-500/20'
                    : ''
                } ${
                  char.motives.sanity < 35
                    ? 'bg-purple-950/95 text-purple-200 border-purple-500 font-mono shadow-purple-950/50'
                    : 'bg-white/95 dark:bg-gray-900/95 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 hover:border-indigo-500 shadow-black/10'
                }`}
              >
                {clusterIndex > 0 && (
                  <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-600 text-white shadow-xs">
                    +{clusterIndex}
                  </span>
                )}
                <div className="flex items-center gap-1.5 font-semibold text-[10px] text-indigo-600 dark:text-indigo-400">
                  <span
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-white dark:ring-gray-800 shrink-0"
                    style={{ backgroundColor: char.color }}
                  />
                  <span className="font-bold truncate">{char.name}</span>
                  {isSpeaking && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[9px] font-bold uppercase tracking-wider">
                      Speaking
                    </span>
                  )}
                  <span className="text-gray-400 dark:text-gray-500 font-normal truncate max-w-[115px]">
                    ({char.currentAction})
                  </span>
                  <span className="shrink-0 px-1.5 py-0.2 rounded bg-amber-100/90 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold">
                    {formatTaskDuration(char.actionTimer)}
                  </span>
                </div>
                <p className="mt-1 leading-snug italic text-[11px] text-gray-800 dark:text-gray-200">
                  "{char.selfTalk}"
                </p>
                <div
                  className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 rotate-45 border-r border-b ${
                    char.motives.sanity < 35
                      ? 'bg-purple-950 border-purple-500'
                      : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700'
                  }`}
                />
              </div>
            </div>
          )
        )}
        </div>
      )}
    </div>
  );
};
