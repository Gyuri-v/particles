import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';

const App = function () {
  let ww, wh;
  let canvas, renderer, scene, camera, light, controls;
  let isRequestRender = false;
  let isAnimation = false;
  let currentShape = 'pumpkin';

  const pointArrays = { pumkin: null, duck: null };
  let particles;

  let maxPointsNum = 0;

  const $container = document.querySelector('.container');
  const $btnChange = $container.querySelector('.btn-ani');
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
    camera.position.set(0, 20, 40);
    camera.lookAt(0, 0, 0);
    scene.add(camera);

    // Light
    light = new THREE.AmbientLight('#fff', 1);
    scene.add(light);

    // Controls
    controls = new OrbitControls(camera, $canvas);
    controls.addEventListener('change', renderRequest);

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

    gltfLoader.load('./resources/models/duck.glb', (gltf) => {
      const model = gltf.scene.children[0];
      const geometry = model.children[1].geometry;
      geometry.scale(0.15, 0.15, 0.15);
      geometry.rotateY(Math.PI);
      geometry.translate(0, 0, -20);
      pointArrays.duck = getModelGeoPositionArray(model);
    });
  };

  const setParticles = function () {
    const material = new THREE.PointsMaterial({ constize: 1, sizeAttenuation: false });
    const geometry = new THREE.BufferGeometry();
    const geometryPoints = pointArrays.pumkin.slice();
    geometry.setAttribute('position', new THREE.BufferAttribute(geometryPoints, 3));

    particles = new THREE.Points(geometry, material);
    particles.rotation.x = -Math.PI / 2;
    particles.position.y = 10;

    scene.add(particles);
    renderRequest();
  };

  const setArrayValuesToSameNum = function () {
    for (const key in pointArrays) {
      if (Object.hasOwnProperty.call(pointArrays, key)) {
        const item = pointArrays[key];

        if (item.length < maxPointsNum) {
          const originArray = Array.from(item);
          let newArray;

          const magnification = Math.ceil(maxPointsNum / item.length);
          for (let i = 0; i < magnification - 1; i++) {
            i === 0 ? (newArray = originArray.concat(originArray)) : (newArray = newArray.concat(originArray));
          }
          // 근데 많아지는 단점

          pointArrays[key] = new Float32Array(newArray);
        }
      }
    }
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

  // Change -------------------
  const changeParticles = function () {
    isAnimation = true;

    if (currentShape == 'pumpkin') {
      currentShape = 'duck';

      gsap.to(particles.geometry.attributes.position.array, {
        endArray: pointArrays.duck,
        duration: 1,
        onUpdate: () => {
          particles.geometry.attributes.position.needsUpdate = true;
          renderRequest();
        },
      });
    } else if (currentShape == 'duck') {
      currentShape = 'pumpkin';

      gsap.to(particles.geometry.attributes.position.array, {
        endArray: pointArrays.pumkin,
        duration: 1,
        onUpdate: () => {
          particles.geometry.attributes.position.needsUpdate = true;
          renderRequest();
        },
      });
    }

    // points.geometry.attributes.position.array =
    // points.geometry.setAttribute('position', new THREE.BufferAttribute(randomPoints, 3));
    // const pointArray = points.geometry.attributes.posiiton.array;
    // console.log(pointArray);
    // for (let i = 0; i < randomArray.length; i++) {
    //   // 위치 이동
    //   gsap.to(imagePanels[i].mesh.position, {
    //     duration: 2,
    //     x: array[i * 3],
    //     y: array[i * 3 + 1],
    //     z: array[i * 3 + 2],
    //   });
    // }

    // gsap.to(imagePanels[i].mesh.position, {
    //   duration: 2,
    //   x: array[i * 3],
    //   y: array[i * 3 + 1],
    //   z: array[i * 3 + 2],
    // });

    // renderRequest();
  };

  const renderRequest = function () {
    isRequestRender = true;
  };

  const render = function () {
    if (isRequestRender) {
      // if (isAnimation) {
      //   console.log('aa');
      //   // for (let i = 0; i < points.geometry.attributes.position.array.length; i++) {
      //   //   // const item = points.geometry.attributes.position.array[i];
      //   //   // console.log(item);
      //   //   // item = randomPoints[i];
      //   //   // points.geometry.attributes.position.needsUpdate = true;
      //   // }
      // }

      renderer.setSize(ww, wh);
      renderer.render(scene, camera);
    }
    window.requestAnimationFrame(render);
  };

  init();
  window.addEventListener('resize', resize);
  $btnChange.addEventListener('click', changeParticles);
};
window.addEventListener('load', App);
