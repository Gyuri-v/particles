import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import gsap from 'gsap';
import dat from 'dat.gui';

import vertexShader from '../shader/clonepsy/vertex.glsl';
import fragmentShader from '../shader/clonepsy/fragment.glsl';
import { Timeline } from 'gsap/gsap-core';

const DEBUG = location.search.indexOf('debug') > -1;

const App = function () {
  let ww, wh;
  let renderer, scene, camera, light, controls, gui, clock, raycaster;
  let textureLoader;
  let pmremGenerator;
  let models, numModels, numLoadedModels, numMaxParticles;
  let isRequestRender = false;

  const $container = document.querySelector('.container');
  const $sections = $container.querySelectorAll('section');
  let $canvas;

  const particleGroup = new THREE.Group();
  const particleInnerGroup = new THREE.Group();
  particleGroup.add(particleInnerGroup);

  let pointMaterial;

  const sectionsLength = $sections.length;
  let positionAttirubutes = null;

  const PI = Math.PI;
  const PI2 = PI * 2;

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
    camera = new THREE.PerspectiveCamera(24, ww / wh, 1, 999);
    camera.position.set(0, 0, 50);
    scene.add(camera);

    // Light
    light = new THREE.AmbientLight('#fff', 1);
    scene.add(light);

    // Loader
    textureLoader = new THREE.TextureLoader();

    // DEBUG
    if (DEBUG) {
      // Controls
      controls = new OrbitControls(camera, $canvas);

      // Gui
      gui = new dat.GUI();
    }

    // Clock
    clock = new THREE.Clock();

    // Raycaster
    raycaster = new THREE.Raycaster();

    // PmremGeneration
    // pmremGenerator = new THREE.PMREMGenerator(renderer);
    // pmremGenerator.compileEquirectangularShader();

    // Axes
    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    // Setting
    setModels();

    // Render
    render();

    // Loading
    THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
      if (itemsLoaded === itemsTotal) {
      }
    };
  };

  const resize = function () {};

  // Timeline
  const onTimelineUpdate = function () {
    const currentIndex = Math.floor(pointMaterial.uniforms.u_transition.value);
    const nextIndex = models[currentIndex + 1] ? currentIndex + 1 : currentIndex;
    pointMaterial.uniforms.u_positions1.value = models[currentIndex].texturePositions;
    pointMaterial.uniforms.u_colors1.value = models[currentIndex].textureColors;
    pointMaterial.uniforms.u_positions2.value = models[nextIndex].texturePositions;
    pointMaterial.uniforms.u_colors2.value = models[nextIndex].textureColors;
  };

  let timeline;
  const setTimeline = function () {
    timeline = gsap.timeline({ paused: true, repeat: -1, yoyo: true, onUpdate: onTimelineUpdate });
    timeline.to(pointMaterial.uniforms.u_transition, 5, { value: 1, ease: 'cubic.inOut' });
    timeline.to(particleInnerGroup.rotation, 5.5, { y: PI2, ease: 'cubic.inOut' }, '<');
    timeline.to(pointMaterial.uniforms.u_transition, 5, { value: 2, ease: 'cubic.inOut' });
    timeline.to(particleInnerGroup.rotation, 5.5, { y: PI2 * 2, ease: 'cubic.inOut' }, '<');
    const timelineDuration = timeline.totalDuration();
  };

  // Setting -------------------
  const setModels = function () {
    models = [
      {
        name: 'cosmonaut',
        setting: (geometry) => {
          geometry.translate(1.65, -5, 3);
          geometry.rotateZ(-0.25);
          geometry.rotateX(0.2);
        },
      },
      {
        name: 'multiple_planets',
        setting: (geometry) => {
          geometry.scale(0.6, 0.6, 0.6);
          geometry.translate(0, 2, -5);
        },
      },
      {
        name: 'spacestation',
        setting: (geometry) => {
          geometry.scale(0.008, 0.008, 0.008);
          geometry.translate(0, -3, -1);
          geometry.rotateX(0.5);
        },
      },
    ];
    numModels = models.length;
    numLoadedModels = 0;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./resources/draco/');
    numMaxParticles = 0;
    models.forEach((info, index) => {
      dracoLoader.load(`./resources/models/clonepsy/${info.name}.drc`, (geometry) => {
        info.setting && info.setting(geometry);

        // console.log(geometry);

        info.positionsArray = geometry.getAttribute('position').array;
        info.colorsArray = geometry.getAttribute('color').array;

        numMaxParticles = Math.max(geometry.getAttribute('position').count, numMaxParticles);
        numLoadedModels++;
        if (numModels === numLoadedModels) {
          setParticle();
          setTimeline();
          setEvent();
        }

        geometry.dispose();
      });
    });
  };

  const setParticle = function () {
    // Material
    pointMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_positions1: { value: null },
        u_positions2: { value: null },
        u_colors1: { value: null },
        u_colors2: { value: null },
        u_transition: { value: 0 },
        u_time: { value: 0 },
        u_pointer: { value: new THREE.Vector3(-10, -10, -10) },
        u_pointerRadius: { value: 1 },

        // u_pointTexture: { value: textureLoader.load('./resources/textures/dot.png') },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColor: true,
    });
    scene.add(particleGroup);

    // Geometry
    const textureSize = nearestPowerOfTwoCeil(Math.sqrt(numMaxParticles));
    const textureArraySize = textureSize * textureSize * 4;

    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(textureSize * textureSize * 3);
    for (let max = textureSize * textureSize, i = 0; i < max; i++) {
      positions[i * 3] = (i % textureSize) / textureSize;
      positions[i * 3 + 1] = i / textureSize / textureSize;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    models.forEach((info, index) => {
      const positions = new Float32Array(textureArraySize);
      for (let values = info.positionsArray, i = 0, j = 0, randomPosition; i < textureArraySize; i += 4, j += 3) {
        if (!info.positionsArray[j]) {
          randomPosition = getSphericalRandomPosition(100);
        }
        positions[i] = info.positionsArray[j] || randomPosition[0];
        positions[i + 1] = info.positionsArray[j + 1] || randomPosition[1];
        positions[i + 2] = info.positionsArray[j + 2] || randomPosition[2];
      }

      const colors = new Float32Array(textureArraySize);
      for (let values = info.colorsArray, i = 0, j = 0; i < textureArraySize; i += 4, j += 3) {
        colors[i] = info.colorsArray[j] || 0;
        colors[i + 1] = info.colorsArray[j + 1] || 0;
        colors[i + 2] = info.colorsArray[j + 2] || 0;
        colors[i + 3] = info.colorsArray[j] ? 1 : 0;
      }

      const shuffledAttributes = [positions, colors];

      info.texturePositions = new THREE.DataTexture(shuffledAttributes[0], textureSize, textureSize, THREE.RGBAFormat, THREE.FloatType);
      info.texturePositions.magFilter = THREE.NearestFilter;
      info.texturePositions.needsUpdate = true;
      delete info.positionsArray;
      info.textureColors = new THREE.DataTexture(shuffledAttributes[1], textureSize, textureSize, THREE.RGBAFormat, THREE.FloatType);
      info.textureColors.magFilter = THREE.NearestFilter;
      info.textureColors.needsUpdate = true;
      delete info.colorsArray;
    });

    pointMaterial.uniforms.u_positions1.value = models[0].texturePositions;
    pointMaterial.uniforms.u_colors1.value = models[0].textureColors;

    const indices = new Float32Array(textureSize * textureSize);
    indices.forEach((v, i) => {
      indices[i] = i;
    });
    geometry.setAttribute('index', new THREE.BufferAttribute(indices, 1));

    const sizes = new Float32Array(textureSize * textureSize);
    sizes.forEach((v, i) => {
      sizes[i] = Math.random() * 1.2;
    });
    const sizeAttributes = new THREE.BufferAttribute(sizes, 1);
    geometry.setAttribute('size', sizeAttributes);

    const mesh = new THREE.Points(geometry, pointMaterial);
    particleInnerGroup.add(mesh);

    gsap.ticker.add(animate);
  };

  const setEvent = function () {
    // Scroll
    window.addEventListener('scroll', onScroll);

    // Mouse
    const mouseSphere = new THREE.Mesh(
      new THREE.SphereGeometry(pointMaterial.uniforms.u_pointerRadius.value, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.15 }),
    );
    scene.add(mouseSphere);

    const followMouseSphere = () => {
      mouseSphere.position.copy(pointMaterial.uniforms.u_pointer.value);
      mouseSphere.scale.set(1, 1, 1);
      mouseSphere.scale.multiplyScalar(pointMaterial.uniforms.u_pointerRadius.value);
    };

    let pointerTween, pointerScaleTween;
    document.documentElement.addEventListener('mousemove', (e) => {
      const worldPosition = getWorldPositionFromScreenPosition(e.clientX, e.clientY);

      pointerTween && pointerTween.kill();
      pointerTween = gsap.to(pointMaterial.uniforms.u_pointer.value, 0.7, { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z, ease: 'quart.out', onUpdate: followMouseSphere });

      pointerScaleTween && pointerScaleTween.kill();
      pointerScaleTween = gsap.to(pointMaterial.uniforms.u_pointerRadius, 0.3, {
        value: 2,
        ease: 'quart.out',
        onUpdate: followMouseSphere,
        onComplete: () => {
          pointerScaleTween = gsap.to(pointMaterial.uniforms.u_pointerRadius, 1.5, { value: 1, ease: 'quad.out', onUpdate: followMouseSphere });
        },
      });
    });
  };

  // Scroll -------------------
  const onScroll = function () {
    const scrollTop = window.scrollY;
    const maxScrollTop = (document.body.scrollHeight || document.documentElement.scrollHeight) - wh;
    timeline.progress(scrollTop / maxScrollTop);
  };

  // Render -------------------
  const render = function () {
    renderer.render(scene, camera);
  };

  let renderedCount = 0;
  const animate = function (time, deltaTime, frame) {
    if (!DEBUG || 6000 > renderedCount) {
      pointMaterial.uniforms.u_time.value += deltaTime * 0.05;
      // particleGroup.rotation.y += deltaTime * 0.0001;
      render();
      renderedCount++;
    }
  };

  // 시작 -------------------
  init();
  window.addEventListener('resize', resize);

  // 함수들 -------------------

  // https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
  const getWorldPositionFromScreenPosition = (function () {
    const vector = new THREE.Vector3();
    const position = new THREE.Vector3();
    return (x, y) => {
      vector.set((x / ww) * 2 - 1, -(y / wh) * 2 + 1, 0.5);
      vector.unproject(camera);
      vector.sub(camera.position).normalize();
      position.copy(camera.position).add(vector.multiplyScalar(-camera.position.z / vector.z));
      return new THREE.Vector3().copy(position);
    };
  })();

  // https://stackoverflow.com/a/35111029
  function nearestPowerOfTwoCeil(v) {
    var p = 2;
    while ((v >>= 1)) {
      p <<= 1;
    }
    return p;
  }

  // https://karthikkaranth.me/blog/generating-random-points-in-a-sphere/
  function getSphericalRandomPosition(multiplier) {
    let u = Math.random(),
      v = Math.random(),
      theta = u * 2.0 * PI,
      phi = Math.acos(2.0 * v - 1.0),
      r = Math.cbrt(Math.random()),
      sinPhi = Math.sin(phi);
    return [r * sinPhi * Math.cos(theta) * multiplier, r * sinPhi * Math.sin(theta) * multiplier, r * Math.cos(phi) * multiplier];
  }

  function shuffleAttributes(arrays, itemSize) {
    const length = arrays[0].length / itemSize;
    const indexedArray = new Uint32Array(length);
    for (let i = 0; i < length; i++) {
      indexedArray[i] = i;
    }
    shuffle(indexedArray);

    const numArrays = arrays.length;
    const shuffledArrays = [];
    arrays.forEach(() => {
      shuffledArrays.push(new Float32Array(arrays[0].length));
    });

    for (let i = 0, index1, index2; i < length; i++) {
      index1 = i * itemSize;
      index2 = indexedArray[i] * itemSize;
      for (let j = 0; j < numArrays; j++) {
        for (let k = 0; k < itemSize; k++) {
          shuffledArrays[j][index1 + k] = arrays[j][index2 + k];
        }
      }
    }

    return shuffledArrays;
  }

  // https://bost.ocks.org/mike/shuffle/
  function shuffle(array) {
    let m = array.length,
      t,
      i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }
    return array;
  }
};
window.addEventListener('load', App);
