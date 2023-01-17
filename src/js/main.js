import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
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
  const $btnChange = $container.querySelector('.btn-ani');
  let $canvas;

  let catBox;
  let catSize = new THREE.Vector3();
  let catOffset;

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
        setArrayValuesToSameNum();
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

    gltfLoader.load('./resources/models/pumpkin.glb', (gltf) => {
      const model = gltf.scene.children[0];
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
      // geometry.scale(0.8, 0.8, 0.8);
      geometry.rotateX(THREE.MathUtils.degToRad(90));
      // geometry.rotateY(THREE.MathUtils.degToRad(10));
      geometry.rotateZ(THREE.MathUtils.degToRad(-60));
      // geometry.translate(0, 0, -30);

      catBox = new THREE.Box3().setFromObject(mesh);
      catSize = catBox.getSize(catSize);

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
          // geometry.rotateY(THREE.MathUtils.degToRad(0));
          geometry.rotateZ(THREE.MathUtils.degToRad(115));
          geometry.translate(-5, 0, 0);
        }
      });
      pointArrays.bird = getModelGeoPositionArray(model);
    });

    gltfLoader.load('./resources/models/bird2.glb', (gltf) => {
      const model = gltf.scene.children[0];
      let geometry, mesh;
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          mesh = child;
          geometry = child.geometry;

          geometry.scale(10, 10, 10);
          geometry.rotateX(THREE.MathUtils.degToRad(90));
          geometry.rotateY(THREE.MathUtils.degToRad(10));
          geometry.rotateZ(THREE.MathUtils.degToRad(20));
          geometry.translate(-2, 0, 3);
        }
      });
      pointArrays.bird = getModelGeoPositionArray(model);
    });
  };

  const setArrayValuesToSameNum = function () {
    for (const key in pointArrays) {
      if (Object.hasOwnProperty.call(pointArrays, key)) {
        const item = pointArrays[key];

        if (item.length < maxPointsNum) {
          const originArray = Array.from(item);
          let newArray = originArray.slice();

          // 몇배 많으면 배율하고
          const mag = Math.floor(maxPointsNum / item.length);
          if (mag > 1) {
            for (let i = 0; i < mag - 1; i++) {
              newArray = newArray.concat(originArray);
            }
          }

          // 나머지 갭만큼 추가 ㅠ_ㅠ
          const gap = maxPointsNum - newArray.length;
          for (let i = 0; i < gap; i++) {
            newArray.push(originArray[i]);
          }

          pointArrays[key] = new Float32Array(newArray);
        }

        // const pointArray = Array.from(pointArrays[key]);
        // const pointArrayAsc = pointArray.slice().sort((a, b) => {
        //   return a - b;
        // });
        // const pointArrayDes = pointArray.slice().sort((a, b) => {
        //   return b - a;
        // });
        // console.log('111', pointArrayAsc, '222', pointArrayDes);

        // console.log(pointArray.length);
        // for (let i = 0; i < 900; i++) {
        //   // console.log(i, pointArrays[key][i]);
        //   // const index = 3 * i;

        //   if (i % 3 === 1) {
        //     console.log(i);
        //     // pointArray.push(pointArrayAsc[i] + Math.random() * 10);
        //   }
        // }
        // console.log(pointArray.length);
      }
    }
  };

  const setParticles = function () {
    const material = new THREE.PointsMaterial({ size: 1.5, constize: 1, sizeAttenuation: false, vertexColors: true, blending: THREE.AdditiveBlending });
    const geometry = new THREE.BufferGeometry();

    const colorInside = new THREE.Color('#7d9be6');
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
    const cameraPosition = camera.position.clone();
    const cameraLookAt = new THREE.Vector3(0, 0, 0);

    particlesPositions = particles.geometry.attributes.position.array;
    particlesTween = gsap.timeline({
      paused: true,
      onUpdate: () => {
        particles.geometry.attributes.position.needsUpdate = true;
        renderRequest();
      },
    });
    particlesTween.to(particlesPositions, { endArray: pointArrays.cat }, 'aaa');
    particlesTween.to(camera.position, { x: -10, y: 30, z: 35 }, 'aaa');
    particlesTween.to(particlesPositions, { endArray: pointArrays.bird }, 'bbb');
    particlesTween.to(camera.position, { x: 0, y: 20, z: 20 }, 'bbb');
    // particlesTween.to(
    //   cameraLookAt,
    //   {
    //     x: -30,
    //     y: catSize.y,
    //     onUpdate: () => {
    //       camera.lookAt(0, cameraLookAt.y, 0);
    //     },
    //   },
    //   'aaa',
    // );

    window.addEventListener('scroll', requestScroll);
  };

  // Change -------------------

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
  const getModelGeoPositionArray = function (model, pointsArray) {
    let geoArrays = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometryArray = Array.from(child.geometry.attributes.position.array);
        geoArrays.push(geometryArray);
      }
    });

    pointsArray = geoArrays.reduce((acc, cur) => {
      return acc.concat(cur);
    });
    pointsArray = new Float32Array(pointsArray);

    maxPointsNum = pointsArray.length > maxPointsNum ? pointsArray.length : maxPointsNum;

    return pointsArray;
  };

  // Render -------------------
  const renderRequest = function () {
    isRequestRender = true;
  };

  const render = function () {
    if (scrollPercent.toFixed(6) !== scrollPercentAcc.toFixed(6)) {
      scrollPercentAcc += (scrollPercent - scrollPercentAcc) * 0.05;
      particlesTween.progress(scrollPercentAcc);
    }

    if (isRequestRender) {
      renderer.setSize(ww, wh);
      renderer.render(scene, camera);
    }
    window.requestAnimationFrame(render);
  };

  init();
  window.addEventListener('resize', resize);
  $btnChange.addEventListener('click', setParticlesAnimation);
};
window.addEventListener('load', App);
