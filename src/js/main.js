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
  let isAnimation = false;
  // let currentShape = 'pumpkin';

  const pointArrays = { pumpkin: null, pumpkinOut: null, cat: null, bird: null };
  let particle, particleIn, particleOut;

  let maxPointsNum = 0;
  let particleTween;
  let particleOrgPositions;
  let particleOutPositions;

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

    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

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

    gltfLoader.load('./resources/models/pumpkin2.glb', (gltf) => {
      const model = gltf.scene.children[0];
      let geometry, mesh;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          mesh = child;
          geometry = child.geometry;

          geometry.rotateX(THREE.MathUtils.degToRad(10));
          geometry.translate(0, 0, -20);
        }
      });
      pointArrays.pumpkin = getModelGeoPositionArray(model);
      pointArrays.pumpkinOut = getModelGeoPositionArray(model, 5000, true);
    });

    gltfLoader.load('./resources/models/cat.glb', (gltf) => {
      const model = gltf.scene.children[0];
      let geometry, mesh;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          mesh = child;
          geometry = child.geometry;

          geometry.rotateX(THREE.MathUtils.degToRad(90));
          geometry.rotateZ(THREE.MathUtils.degToRad(-60));
        }
      });
      pointArrays.cat = getModelGeoPositionArray(model);
      pointArrays.catOut = getModelGeoPositionArray(model, 5000, true);
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
      pointArrays.birdOut = getModelGeoPositionArray(model, 5000, true);
    });
  };

  // const setInOutPoint = function () {
  //   for (const key in pointArrays) {
  //     if (Object.hasOwnProperty.call(pointArrays, key)) {
  //       const array = pointArrays[key];

  //       pointArrays[key + 'Out'] = new Float32Array(array.length);

  //       for (let i = 0; i < array.length - 1; i++) {
  //         pointArrays[key + 'Out'][i] = array[i] + Math.random() * 0.2;
  //       }
  //     }
  //   }
  // };

  const setParticle = function () {
    const material = new THREE.PointsMaterial({ size: 1.5, constize: 1, sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending });
    const geometryOrg = new THREE.BufferGeometry();
    const geometryOut = new THREE.BufferGeometry();

    const colorInside = new THREE.Color('#7d9be6');
    const colorOutside = new THREE.Color('#001d67');
    const positions = pointArrays.pumpkin.slice();
    const colors = new Float32Array(positions.length * 3);
    for (let i = 0; i < positions.length; i++) {
      const radius = Math.random() * 5;
      const mixedColor = colorInside.clone();
      mixedColor.lerp(colorOutside, radius / 5);

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    // org
    geometryOrg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometryOrg.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    particle = new THREE.Points(geometryOrg, material);
    particle.rotation.x = -Math.PI / 2;
    particle.position.y = 10;

    // out
    geometryOut.setAttribute('position', new THREE.BufferAttribute(pointArrays.pumpkinOut, 3));
    geometryOut.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    particleOut = new THREE.Points(geometryOut, material);
    particleOut.rotation.x = -Math.PI / 2;
    particleOut.position.y = 10;

    scene.add(particle, particleOut);
    renderRequest();

    isAnimation = true;
  };

  const setParticleAnimation = function () {
    particleOrgPositions = particle.geometry.attributes.position.array;
    particleOutPositions = particleOut.geometry.attributes.position.array;

    particleTween = gsap.timeline({ paused: true });
    particleTween.to(particleOrgPositions, { endArray: pointArrays.cat }, 'toCat');
    particleTween.to(particleOutPositions, { endArray: pointArrays.catOut }, 'toCat');
    particleTween.to(camera.position, { x: -10, y: 30, z: 35 }, 'toCat');
    particleTween.to(particleOrgPositions, { endArray: pointArrays.bird }, 'toBird');
    particleTween.to(particleOutPositions, { endArray: pointArrays.birdOut }, 'toBird');
    particleTween.to(camera.position, { x: 0, y: 20, z: 20 }, 'toBird');

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
  const getModelGeoPositionArray = function (model, count, isScatter) {
    const tempPosition = new THREE.Vector3();
    const samplePoints = [];

    let countNum = count ? count : 20000;

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

  let particleCount = 0;
  let posX, posY, posZ;
  // 문제1 ) 반짝이가 점점 이동함
  // 문제2 ) gsap 이동하는동안 ramdom으로 움지는것은 작동안해서 멈춰보임
  // 문제3 ) 너무 빠르게 일정방향으로만 움직임

  // -> 웨이브 동작 진행해보기
  // -> 웨이브 치는 값 + gsap 이동하는 값을 설정할수있을까..

  const update = function () {
    if (scrollPercent.toFixed(3) !== scrollPercentAcc.toFixed(3)) {
      scrollPercentAcc += (scrollPercent - scrollPercentAcc) * 0.05;
      particleTween.progress(scrollPercentAcc);
      particle.geometry.attributes.position.needsUpdate = true;
    }

    if (isAnimation && pointArrays.pumpkinOut) {
      for (let i = 0; i < pointArrays.pumpkinOut.length / 3; i++) {
        const i3 = i * 3;

        posX = pointArrays.pumpkinOut[i3] - Math.sin(i + particleCount) * Math.random() * 0.05;
        posY = pointArrays.pumpkinOut[i3 + 1] - Math.cos(i + particleCount) * Math.random() * 0.05;
        posZ = pointArrays.pumpkinOut[i3 + 2] - Math.sin(i + particleCount) * Math.random() * 0.05;

        pointArrays.pumpkinOut[i3] = posX;
        pointArrays.pumpkinOut[i3 + 1] = posY;
        pointArrays.pumpkinOut[i3 + 2] = posZ;

        particleOut.geometry.attributes.position.needsUpdate = true;
      }
      particleCount += 0.1;
    }
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
