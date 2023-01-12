import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { gsap } from 'gsap';

const App = function () {
  let ww, wh;
  let canvas, renderer, scene, camera, light, controls;
  let isRequestRender = false;
  let isAnimation = false;
  let currentShape;

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
  };

  const resize = function () {
    //
  };

  const randomArray = [];
  const pumpkinGeoArrays = [];
  let pumpkinGeoPoints;
  const foxGeoArrays = [];
  let foxGeoPoints;
  let randomPoints;
  let points;

  const setModels = function () {
    let geometry = new THREE.BufferGeometry();
    let material = new THREE.PointsMaterial({
      size: 1,
      sizeAttenuation: false,
    });

    const gltfLoader = new GLTFLoader();
    gltfLoader.load('./resources/models/pumpkin.glb', (gltf) => {
      const model = gltf.scene.children[0];

      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const geometryArray = Array.from(child.geometry.attributes.position.array);
          pumpkinGeoArrays.push(geometryArray);
        }
      });

      pumpkinGeoPoints = pumpkinGeoArrays.reduce((acc, cur) => {
        return acc.concat(cur);
      });
      pumpkinGeoPoints = new Float32Array(pumpkinGeoPoints);
      const pumpkinGeoPointsCopy = pumpkinGeoPoints.slice();
      console.log(pumpkinGeoPoints);

      for (let i = 0; i < pumpkinGeoPoints.length; i++) {
        randomArray.push((Math.random() - 0.5) * 100);
      }
      randomPoints = new Float32Array(randomArray);

      currentShape = 'pumpkin';
      geometry.setAttribute('position', new THREE.BufferAttribute(pumpkinGeoPointsCopy, 3));
      points = new THREE.Points(geometry, material);
      points.rotation.x = -Math.PI / 2;
      points.position.y = 10;

      // scene.add(model);
      scene.add(points);
      renderRequest();
    });

    gltfLoader.load('./resources/models/duck.glb', (gltf) => {
      const model = gltf.scene.children[0];
      model.scale.set(0.3, 0.3, 0.3);
      model.position.y = -10;

      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const geometryArray = Array.from(child.geometry.attributes.position.array);
          foxGeoArrays.push(geometryArray);
        }
      });

      foxGeoPoints = foxGeoArrays.reduce((acc, cur) => {
        return acc.concat(cur);
      });
      foxGeoPoints = new Float32Array(foxGeoPoints);
      console.log(foxGeoPoints);
      // const foxGeoPointsCopy = foxGeoPoints.slice();

      // geometry.setAttribute('position', new THREE.BufferAttribute(foxGeoPointsCopy, 3));
      // points = new THREE.Points(geometry, material);
      // points.rotation.x = -Math.PI / 2;
      // points.position.y = 10;

      // scene.add(model);
      // scene.add(points);
    });
  };

  // const setParticles = function () {
  // }

  const changeParticles = function () {
    isAnimation = true;

    if (currentShape == 'pumpkin') {
      currentShape = 'random';

      gsap.to(points.geometry.attributes.position.array, {
        endArray: foxGeoPoints,
        duration: 1,
        onUpdate: () => {
          points.geometry.attributes.position.needsUpdate = true;
          renderRequest();
        },
      });
    } else if (currentShape == 'random') {
      currentShape = 'pumpkin';

      gsap.to(points.geometry.attributes.position.array, {
        endArray: pumpkinGeoPoints,
        duration: 1,
        onUpdate: () => {
          points.geometry.attributes.position.needsUpdate = true;
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
