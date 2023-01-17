import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import dat from 'dat.gui';

const App = function () {
  let ww, wh;
  let renderer, scene, camera, light, controls, gui;
  let isRequestRender = false;
  // let currentShape = 'pumpkin';

  const pointArrays = { pumkin: null, cat: null, bird: null };
  let particles;

  let maxPointsNum = 0;
  let particlesTween;
  let particlesPositions;

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
    // controls = new OrbitControls(camera, $canvas);
    // controls.addEventListener('change', renderRequest);

    // Gui
    gui = new dat.GUI();

    // Setting
    setModels();

    // Render
    renderRequest();
    render();

    // Loading
    THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
      if (itemsLoaded === itemsTotal) {
        setParticles();
        setParticlesAnimation();

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

    gltfLoader.load('./resources/models/pumpkin2.glb', (gltf) => {
      const model = gltf.scene.children[0];
      let geometry, mesh;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          mesh = child;
          geometry = child.geometry;
        }
      });
      geometry.rotateX(THREE.MathUtils.degToRad(10));
      geometry.translate(0, 0, -20);
      pointArrays.pumkin = getModelGeoPositionArray(model);
    });

    gltfLoader.load('./resources/models/cat.glb', (gltf) => {
      const model = gltf.scene.children[0];
      let geometry, mesh;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          mesh = child;
          geometry = child.geometry;
        }
      });
      geometry.rotateX(THREE.MathUtils.degToRad(90));
      geometry.rotateZ(THREE.MathUtils.degToRad(-60));

      pointArrays.cat = getModelGeoPositionArray(model);
    });

    gltfLoader.load('./resources/models/bird.glb', (gltf) => {
      const model = gltf.scene.children[0];
      let geometry, mesh;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          mesh = child;
          geometry = child.geometry;

          geometry.scale(4, 4, 4);
          geometry.rotateX(THREE.MathUtils.degToRad(90));
          geometry.rotateZ(THREE.MathUtils.degToRad(115));
          geometry.translate(-5, 0, 0);
        }
      });
      pointArrays.bird = getModelGeoPositionArray(model);
    });
  };

  const setParticles = function () {
    const material = new THREE.PointsMaterial({ size: 1.5, constize: 1, sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending });
    const geometry = new THREE.BufferGeometry();

    const colorInside = new THREE.Color('#fff');
    const colorOutside = new THREE.Color('#001d67');

    const positions = pointArrays.pumkin.slice();
    const colors = new Float32Array(positions.length * 3);
    for (let i = 0; i < positions.length; i++) {
      const radius = Math.random() * 5;
      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, radius / 5);

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    particles = new THREE.Points(geometry, material);
    particles.rotation.x = -Math.PI / 2;
    particles.position.y = 10;

    scene.add(particles);

    renderRequest();
  };

  const setParticlesAnimation = function () {
    particlesPositions = particles.geometry.attributes.position.array;
    particlesTween = gsap.timeline({ paused: true });
    particlesTween.to(particlesPositions, { endArray: pointArrays.cat }, 'toCat');
    particlesTween.to(camera.position, { x: -10, y: 30, z: 35 }, 'toCat');
    particlesTween.to(particlesPositions, { endArray: pointArrays.bird }, 'toBird');
    particlesTween.to(camera.position, { x: 0, y: 20, z: 20 }, 'toBird');

    window.addEventListener('scroll', requestScroll);
  };

  // Scroll -------------------
  const requestScroll = function () {
    requestAnimationFrame(scroll);
  };

  let scrollPercent = 0;
  let scrollPercentAcc = 0;
  const scroll = function () {
    const scrollTop = window.scrollY;
    const moveArea = $container.offsetHeight - wh;
    const percent = scrollTop / moveArea;

    scrollPercent = percent;
  };

  // Get -------------------
  const getModelGeoPositionArray = function (model) {
    const tempPosition = new THREE.Vector3();
    const points = [];

    let sampler;
    model.traverse((obj) => {
      if (obj.isMesh) {
        sampler = new MeshSurfaceSampler(obj).build();
      }
    });

    for (let i = 0; i < 20000; i++) {
      sampler.sample(tempPosition);
      points.push(tempPosition.x, tempPosition.y, tempPosition.z);
    }

    const pointArray = new Float32Array(points, 3);
    return pointArray;
  };

  // Render -------------------
  const renderRequest = function () {
    isRequestRender = true;
  };

  const render = function () {
    if (scrollPercent.toFixed(6) !== scrollPercentAcc.toFixed(6)) {
      scrollPercentAcc += (scrollPercent - scrollPercentAcc) * 0.05;
      particlesTween.progress(scrollPercentAcc);
      particles.geometry.attributes.position.needsUpdate = true;
    }

    if (isRequestRender) {
      renderer.setSize(ww, wh);
      renderer.render(scene, camera);
    }
    window.requestAnimationFrame(render);
  };

  init();
  window.addEventListener('resize', resize);
};
window.addEventListener('load', App);
