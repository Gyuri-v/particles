import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import dat from 'dat.gui';

import vertexShader from '../shader/vertex.glsl';
import fragmentShader from '../shader/fragment.glsl';

const DEBUG = location.search.indexOf('debug') > -1;

const App = function () {
  let ww, wh;
  let renderer, scene, camera, light, controls, gui, clock;
  let isRequestRender = false;
  let isAnimation = false;

  let geometry, material, particle;
  const pointArrays = { pumpkin: null, cat: null, bird: null };
  const parameters = {
    count: 40000,
    size: 0.5,
    radius: 5,
    branches: 3,
    spin: 1,
    randomness: 0.2,
    randomnessPower: 3,
    insideColor: '#ff6030',
    outsideColor: '#1b3984',
  };

  const $container = document.querySelector('.container');
  let $canvas;

  const init = function () {
    // Window
    ww = window.innerWidth;
    wh = window.innerHeight;

    // Scene
    scene = new THREE.Scene();

    // Renderer
    renderer = new THREE.WebGL1Renderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor('#000', 1.0);
    renderer.setSize(ww, wh);
    $canvas = renderer.domElement;
    $container.appendChild($canvas);

    // Camera
    camera = new THREE.PerspectiveCamera(70, ww / wh, 0.1, 1000);
    camera.position.set(0, 0, 30);
    // camera.lookAt(0, 0, 0);
    scene.add(camera);

    // Light
    light = new THREE.AmbientLight('#fff', 1);
    scene.add(light);

    // Controls
    if (DEBUG) {
      controls = new OrbitControls(camera, $canvas);
      controls.addEventListener('change', renderRequest);
    }

    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    // Gui
    gui = new dat.GUI();

    // Clock
    clock = new THREE.Clock();

    // Setting
    setModels();

    // Render
    renderRequest();
    render();

    // Loading
    THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
      if (itemsLoaded === itemsTotal) {
        // setInOutPoint();
        setParticle();
        setParticleAnimation();

        requestScroll();
      }
    };
  };

  const resize = function () {
    //
  };

  // Setting -------------------
  const setModels = function () {
    const gltfLoader = new GLTFLoader();

    gltfLoader.load('./resources/models/pumpkin3.glb', (gltf) => {
      const model = gltf.scene.children[0];
      pointArrays.pumpkin = getModelGeoPositionArray(model);
    });

    gltfLoader.load('./resources/models/cat2.glb', (gltf) => {
      const model = gltf.scene.children[0];
      let meshGeometery, mesh;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          mesh = child;
          meshGeometery = child.geometry;
          meshGeometery.translate(-7, 0, 0);
        }
      });
      pointArrays.cat = getModelGeoPositionArray(model);
    });

    gltfLoader.load('./resources/models/bird.glb', (gltf) => {
      const model = gltf.scene.children[0];
      let meshGeometery, mesh;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          mesh = child;
          meshGeometery = child.geometry;

          // meshGeometery.scale(4, 4, 4);
          // meshGeometery.rotateX(THREE.MathUtils.degToRad(90));
          // meshGeometery.rotateZ(THREE.MathUtils.degToRad(115));
          // meshGeometery.translate(-5, 0, 0);
        }
      });
      pointArrays.bird = getModelGeoPositionArray(model);
    });
  };

  const setParticle = function () {
    // -- Geometry
    geometry = new THREE.BufferGeometry();

    const positions = pointArrays.pumpkin.slice();
    const positionCat = pointArrays.cat.slice();
    const positionBird = pointArrays.bird.slice();
    const randomness = new Float32Array(parameters.count * 3);
    const scales = new Float32Array(parameters.count * 1);
    const colors = new Float32Array(parameters.count * 3);

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for (let i = 0; i < parameters.count; i++) {
      const i3 = i * 3;

      // Position
      const radius = Math.random() * parameters.radius;

      const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
      const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
      const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

      randomness[i3] = randomX;
      randomness[i3 + 1] = randomY;
      randomness[i3 + 2] = randomZ;

      // Color
      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, radius / parameters.radius);

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;

      // Scale
      scales[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aRandomness', new THREE.BufferAttribute(randomness, 3));
    geometry.setAttribute('aPositionCat', new THREE.BufferAttribute(positionCat, 3));
    geometry.setAttribute('aPositionBird', new THREE.BufferAttribute(positionBird, 3));

    // -- Material
    material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uSize: { value: 50.0 },
        uScroll: { value: 0 },
      },
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    // -- Points
    particle = new THREE.Points(geometry, material);
    scene.add(particle);
    renderRequest();

    isAnimation = true;
  };

  let particleTween;
  const setParticleAnimation = function () {
    const particleOrgPositions = particle.geometry.attributes.position.array;

    // particleTween = gsap.timeline({ paused: true });
    // particleTween.to(particleOrgPositions, { endArray: pointArrays.cat }, 'toCat');
    // particleTween.to(camera.position, { x: -10, y: 30, z: 35 }, 'toCat');
    // particleTween.to(particleOrgPositions, { endArray: pointArrays.bird }, 'toBird');
    // particleTween.to(camera.position, { x: 0, y: 20, z: 20 }, 'toBird');

    window.addEventListener('scroll', requestScroll);
  };

  // Scroll -------------------
  const requestScroll = function () {
    requestAnimationFrame(scroll);
  };

  let scrollPercent = 0;
  const scroll = function () {
    const scrollTop = window.scrollY;
    const moveArea = $container.offsetHeight - wh;
    const percent = scrollTop / moveArea;

    scrollPercent = percent;

    // particleTween.progress(percent);
    material.uniforms.uScroll.value = percent.toFixed(1) * 1;
  };

  // Get -------------------
  const getModelGeoPositionArray = function (model, count, isScatter) {
    const tempPosition = new THREE.Vector3();
    const samplePoints = [];

    let countNum = count ? count : parameters.count;

    let sampler;
    model.traverse((obj) => {
      if (obj.isMesh) {
        sampler = new MeshSurfaceSampler(obj).build();
      }
    });

    for (let i = 0; i < countNum; i++) {
      sampler.sample(tempPosition);
      if (isScatter) {
        const posX = tempPosition.x > 0 ? tempPosition.x + Math.random() : tempPosition.x - Math.random();
        const posY = tempPosition.y > 0 ? tempPosition.y + Math.random() : tempPosition.y - Math.random();
        const posZ = tempPosition.z > 0 ? tempPosition.z + Math.random() : tempPosition.z - Math.random();

        samplePoints.push(posX, posY, posZ);
      } else {
        samplePoints.push(tempPosition.x, tempPosition.y, tempPosition.z);
      }
    }

    const pointArray = new Float32Array(samplePoints, 3);
    return pointArray;
  };

  // Render -------------------
  const renderRequest = function () {
    isRequestRender = true;
  };

  const render = function () {
    // update();

    // if (isRequestRender) {
    renderer.setSize(ww, wh);
    renderer.render(scene, camera);
    // }
    window.requestAnimationFrame(render);
  };

  init();
  window.addEventListener('resize', resize);
};
window.addEventListener('load', App);
