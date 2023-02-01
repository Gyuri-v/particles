import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import dat from 'dat.gui';

import vertexShader from '../shader/_vertex.glsl';
import fragmentShader from '../shader/_fragment.glsl';

const DEBUG = location.search.indexOf('debug') > -1;

const App = function () {
  let ww, wh;
  let renderer, scene, camera, light, controls, gui, clock, raycaster;
  let isRequestRender = false;

  let scrollPercent = 0;
  let scrollPercentAcc = 0;
  let scrollPercentAni = 0;

  let geometry, material, particle;

  const meshes = [];
  const mouse = new THREE.Vector3();
  const current = { model: '' };
  const pointArrays = {
    pumpkin: null,
    cat: null,
    bird: null,
  };
  const parameters = {
    count: 50000,
    size: 0.5,
    radius: 5,
    branches: 3,
    spin: 1,
    randomness: 0.5,
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
    scene.add(camera);

    // Light
    light = new THREE.AmbientLight('#fff', 1);
    scene.add(light);

    // Controls
    if (DEBUG) {
      controls = new OrbitControls(camera, $canvas);
      controls.addEventListener('change', renderRequest);
    }

    // Gui
    gui = new dat.GUI();

    // Clock
    clock = new THREE.Clock();

    // Raycaster
    raycaster = new THREE.Raycaster();
    // raycaster.params.Points.threshold = 1; // 포인트 찍히도록 하는거

    // Setting
    setModels();

    // Render
    renderRequest();
    render();

    // Loading
    THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
      if (itemsLoaded === itemsTotal) {
        setParticle();
        setEvents();

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

    gltfLoader.load('./resources/models/pumpkin.glb', (gltf) => {
      // const model = gltf.scene.children[0];
      let model;
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          model = child;

          console.log(model.material.color);
        }
      });
      pointArrays.pumpkin = getModelGeoPositionArray(model);
      // scene.add(model);
      meshes.push(model);
    });

    gltfLoader.load('./resources/models/cat.glb', (gltf) => {
      const model = gltf.scene.children[0];
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          console.log(child.material.color);
        }
      });
      pointArrays.cat = getModelGeoPositionArray(model);
      // scene.add(model);
      // meshes.push(model);
    });

    gltfLoader.load('./resources/models/bird.glb', (gltf) => {
      const model = gltf.scene.children[0];
      pointArrays.bird = getModelGeoPositionArray(model);
      // scene.add(model);
      // meshes.push(model);
    });
  };

  const setParticle = function () {
    // - Geometry
    geometry = new THREE.BufferGeometry();

    const positions = pointArrays.pumpkin.slice();
    const positionCat = pointArrays.cat.slice();
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
    geometry.setAttribute('aPositionTarget', new THREE.BufferAttribute(positionCat, 3));

    // - Material
    material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        uSize: { value: 50.0 * renderer.getPixelRatio() },
        uScroll: { value: 0 },
        uMouse: { value: new THREE.Vector3() },
      },
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    // - Points
    current.model = 'pumkin';
    particle = new THREE.Points(geometry, material);
    scene.add(particle);
    renderRequest();
  };

  let ball, mesh;
  const setEvents = function () {
    window.addEventListener('scroll', requestScroll);

    mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(30, 30, 30, 30), new THREE.MeshBasicMaterial({ color: 'blue', wireframe: true }));
    // scene.add(mesh);

    // ball = new THREE.Mesh(new THREE.SphereBufferGeometry(1, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }));
    // scene.add(ball);

    // console.log(meshes);

    $canvas.addEventListener('mousemove', function (e) {
      mouse.x = (e.clientX / $canvas.clientWidth) * 2 - 1;
      mouse.y = -((e.clientY / $canvas.clientHeight) * 2 - 1);

      // material.uniforms.uMouse.value = mouse;

      checkIntersects();
    });
  };

  // Raycaster ----------------
  const checkIntersects = function () {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([particle]);

    if (intersects[0]) {
      // console.log(intersects[0].point);
      // ball.position.copy(intersects[0].point);
      material.uniforms.uMouse.value = intersects[0].point;
    }
  };

  // Scroll -------------------
  const requestScroll = function () {
    requestAnimationFrame(scroll);
  };
  const scroll = function () {
    const scrollTop = window.scrollY;
    const moveArea = $container.offsetHeight - wh;
    const percent = scrollTop / moveArea;

    scrollPercent = percent;
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
  const update = function () {
    if (scrollPercent.toFixed(3) !== scrollPercentAcc.toFixed(3)) {
      scrollPercentAcc += (scrollPercent - scrollPercentAcc) * 0.1;

      if (scrollPercentAcc < 0.5) {
        scrollPercentAni = scrollPercentAcc * 2;

        if (current.model !== 'pumkin') {
          current.model = 'pumkin';

          geometry.setAttribute('position', new THREE.BufferAttribute(pointArrays.pumpkin, 3));
          geometry.setAttribute('aPositionTarget', new THREE.BufferAttribute(pointArrays.cat, 3));
        }
      } else {
        scrollPercentAni = scrollPercentAcc * 2 - 1;

        if (current.model !== 'cat') {
          current.model = 'cat';

          geometry.setAttribute('position', new THREE.BufferAttribute(pointArrays.cat, 3));
          geometry.setAttribute('aPositionTarget', new THREE.BufferAttribute(pointArrays.bird, 3));
        }
      }
      material.uniforms.uScroll.value = scrollPercentAni * 1;
    }
  };

  const renderRequest = function () {
    isRequestRender = true;
  };

  const render = function () {
    update();

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

const getPoint = function (e) {
  if (e.touches) {
    e = e.touches[0] || e.changedTouches[0];
  }
  return [e.pageX || e.clientX, e.pageY || e.clientY];
};
