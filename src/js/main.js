import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import gsap from 'gsap';
import dat from 'dat.gui';

import vertexShader from '../shader/vertex.glsl';
import fragmentShader from '../shader/fragment.glsl';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';

const DEBUG = location.search.indexOf('debug') > -1;

const App = function () {
  let ww, wh;
  let renderer, scene, camera, light, controls, gui, clock, raycaster, textureLoader;
  let models;
  let numModels = 0;
  let numLoadedModels = 0;
  let numMaxParticles = 0;
  let pointMaterial;
  let timeline;
  let mouse = new THREE.Vector2();

  const PI = Math.PI;
  const PI2 = PI * 2;

  const particleGroup = new THREE.Group();
  const particleInnerGroup = new THREE.Group();
  particleGroup.add(particleInnerGroup);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    // Controls
    if (DEBUG) {
      controls = new OrbitControls(camera, $canvas);
      controls.addEventListener('change', render);
    }

    // Gui
    gui = new dat.GUI();

    // Axes
    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    // Clock
    clock = new THREE.Clock();

    // Raycaster
    raycaster = new THREE.Raycaster();

    // Loader
    textureLoader = new THREE.TextureLoader();

    // Setting
    setModels();

    // Render
    render();

    // Loading
    THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
      if (itemsLoaded === itemsTotal) {
        requestScroll();
        render();
      }
    };
  };

  const resize = function () {
    //
  };

  // Setting -------------------
  const setModels = function () {
    // 모델 세팅
    models = [
      {
        name: 'cat',
        setting: (geometry) => {
          geometry.scale(0.5, 0.5, 0.5);
        },
      },
      {
        name: 'bird',
        setting: (geometry) => {
          geometry.scale(0.5, 0.5, 0.5);
        },
      },
      {
        name: 'horse',
        setting: (geometry) => {
          geometry.scale(0.5, 0.5, 0.5);
        },
      },
    ];
    numModels = models.length;
    numLoadedModels = 0;

    // 모델 로딩
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./resources/draco/');

    models.forEach((info, index) => {
      dracoLoader.load(`./resources/models/draco/${info.name}.drc`, (geometry) => {
        info.setting && info.setting(geometry);

        const samplerArray = getModelSamplerPositions(geometry);

        info.positionsArray = samplerArray;

        numMaxParticles = Math.max(geometry.getAttribute('position').count, numMaxParticles);
        numLoadedModels++;
        if (numModels === numLoadedModels) {
          setParticle();
          setTimeline();
          setEvents();
        }

        geometry.dispose();
      });
    });
  };

  const getModelSamplerPositions = function (geometry, count) {
    const tempPosition = new THREE.Vector3();
    const samplePoints = [];

    let countNum = count ? count : 50000;

    let sampler;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    sampler = new MeshSurfaceSampler(mesh).build();

    for (let i = 0; i < countNum; i++) {
      sampler.sample(tempPosition);
      samplePoints.push(tempPosition.x, tempPosition.y, tempPosition.z);
    }

    const pointArray = new Float32Array(samplePoints, 3);
    return pointArray;
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
        u_mouse: { value: new THREE.Vector3(0, 0, 0) },
        u_mouseRadius: { value: 1.5 },
        u_pointTexture: { value: textureLoader.load('./resources/textures/dot.png') },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColor: true,
    });

    // Geometry
    const geometry = new THREE.BufferGeometry();
    const textureSize = nearestPowerOfTwoCeil(Math.sqrt(numMaxParticles));
    const textureArraySize = textureSize * textureSize * 4; // 왜 4
    const colorInside = new THREE.Color('#ff6030');
    const colorOutside = new THREE.Color('#1b3984');

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
      for (let values = info.colorsArray, i = 0; i < textureArraySize; i++) {
        const radius = Math.random() * 5;
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, radius / 5);

        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
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
      sizes[i] = Math.random() * renderer.getPixelRatio() * 0.5;
    });
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mesh = new THREE.Points(geometry, pointMaterial);
    particleInnerGroup.add(mesh);

    gsap.ticker.add(animate);
    scene.add(particleGroup);
  };

  const setEvents = function () {
    // Scroll
    window.addEventListener('scroll', requestScroll);

    // Mouse move
    let mouseSphere, followMouseSphere;
    let pointerTween;
    let pointerScaleTween;
    let particleInnerTween;

    if (DEBUG) {
      mouseSphere = new THREE.Mesh(new THREE.SphereGeometry(pointMaterial.uniforms.u_mouseRadius.value, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }));
      scene.add(mouseSphere);

      followMouseSphere = function () {
        mouseSphere.position.copy(pointMaterial.uniforms.u_mouse.value);
        mouseSphere.scale.set(1, 1, 1);
        mouseSphere.scale.multiplyScalar(pointMaterial.uniforms.u_mouseRadius.value);
        render();
      };
    }

    document.documentElement.addEventListener('mousemove', function (e) {
      const worldPosition = getWorldPositionFromScreenPosition(e.clientX, e.clientY);

      pointerTween && pointerTween.kill();
      pointerTween = gsap.to(pointMaterial.uniforms.u_mouse.value, 0.7, { x: worldPosition.x, y: worldPosition.y, z: worldPosition.z, ease: 'quart.out', onUpdate: followMouseSphere });

      // pointerScaleTween && pointerScaleTween.kill();
      // pointerScaleTween = gsap.to(pointMaterial.uniforms.u_mouseRadius, 0.3, {
      //   value: 2,
      //   ease: 'quart.out',
      //   onUpdate: followMouseSphere,
      //   onComplete: () => {
      //     pointerScaleTween = gsap.to(pointMaterial.uniforms.u_mouseRadius, 1.5, { value: 1, ease: 'quad.out', onUpdate: followMouseSphere });
      //   },
      // });

      particleInnerTween && particleInnerTween.kill();
      particleInnerTween = gsap.to(particleGroup.rotation, 0.7, { x: THREE.MathUtils.degToRad(worldPosition.y * -1), y: THREE.MathUtils.degToRad(worldPosition.x * -1), ease: 'quart.out' });
    });
  };

  // Timeline -------------------
  const setTimeline = function () {
    timeline = gsap.timeline({ paused: true, repeat: -1, yoyo: true, onUpdate: onTimelineUpdate });
    timeline.to(pointMaterial.uniforms.u_transition, 5, { value: 1, ease: 'cubic.inOut' });
    timeline.to(particleInnerGroup.rotation, 5.5, { y: PI2, ease: 'cubic.inOut' }, '<');
    timeline.to(pointMaterial.uniforms.u_transition, 5, { value: 2, ease: 'cubic.inOut' });
    timeline.to(particleInnerGroup.rotation, 5.5, { y: PI2 * 2, ease: 'cubic.inOut' }, '<');
  };

  const onTimelineUpdate = function () {
    const currentIndex = Math.floor(pointMaterial.uniforms.u_transition.value);
    const nextIndex = models[currentIndex + 1] ? currentIndex + 1 : currentIndex;
    pointMaterial.uniforms.u_positions1.value = models[currentIndex].texturePositions;
    pointMaterial.uniforms.u_colors1.value = models[currentIndex].textureColors;
    pointMaterial.uniforms.u_positions2.value = models[nextIndex].texturePositions;
    pointMaterial.uniforms.u_colors2.value = models[nextIndex].textureColors;
    render();
  };

  // Scroll -------------------
  const requestScroll = function () {
    requestAnimationFrame(scroll);
  };
  const scroll = function () {
    const scrollTop = window.scrollY;
    const moveArea = $container.offsetHeight - wh;
    const percent = scrollTop / moveArea;
    timeline && timeline.progress(percent);
  };

  // Animation -------------------
  const animate = function (time, deltaTime, frame) {
    pointMaterial.uniforms.u_time.value += deltaTime * 0.05;
    // particleGroup.rotation.y += deltaTime * 0.0001;
    render();
  };

  // Render -------------------
  const render = function () {
    renderer.render(scene, camera);
  };

  init();
  window.addEventListener('resize', resize);

  // --------------------------------------
  // --------------------------------------
  // --------------------------------------
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
    let u = Math.random();
    let v = Math.random();
    let theta = u * 2.0 * PI;
    let phi = Math.acos(2.0 * v - 1.0);
    let r = Math.cbrt(Math.random());
    let sinPhi = Math.sin(phi);
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

  // getPoint
  const getPoint = function (e) {
    if (e.touches) {
      e = e.touches[0] || e.changedTouches[0];
    }
    return [e.pageX || e.clientX, e.pageY || e.clientY];
  };
};
window.addEventListener('load', App);
