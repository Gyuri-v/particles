import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import gsap from 'gsap';
import dat from 'dat.gui';

import vertexShader from '../shader/vertex.glsl';
import fragmentShader from '../shader/fragment.glsl';
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
    camera = new THREE.PerspectiveCamera(70, ww / wh, 0.1, 1000);
    camera.position.set(0, 0, 30);
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
      controls.addEventListener('change', renderRequest);

      // Gui
      gui = new dat.GUI();
    }

    // Clock
    clock = new THREE.Clock();

    // Raycaster
    raycaster = new THREE.Raycaster();

    // PmremGeneration
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Setting
    setModels();

    // Render
    renderRequest();
    render();

    // Loading
    THREE.DefaultLoadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
      if (itemsLoaded === itemsTotal) {
        setParticle();
        window.addEventListener('scroll', onScroll);
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
    const gltfLoader = new GLTFLoader();

    models = [
      {
        name: 'pumpkin',
        setting: (geometry) => {},
      },
      {
        name: 'cat',
        setting: (geometry) => {},
      },
      {
        name: 'bird',
        setting: (geometry) => {},
      },
    ];
    numModels = models.length;
    numLoadedModels = 0;
    numMaxParticles = 0;

    models.forEach((info, index) => {
      gltfLoader.load(`./resources/models/${info.name}.glb`, (gltf) => {
        let geometry;
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            geometry = child.geometry;
          }
        });
        info.setting && info.setting(geometry);

        console.log(geometry);

        info.positionsArray = geometry.getAttribute('position').array;
        info.colorArray = geometry.setAttribute('color', new THREE.BufferAttribute(info.positionsArray.length, 3));

        numMaxParticles = Math.max(geometry.getAttribute('position').count, numMaxParticles);
        numLoadedModels++;
        numModels === numLoadedModels && setParticle();

        geometry.dispose();
      });
    });
  };

  const setParticle = function () {
    const textureSize = nearestPowerOfTwoCeil(Math.sqrt(numMaxParticles));
    const textureArraySize = textureSize * textureSize * 4;

    const geometry = new THREE.BufferAttribute();

    const positions = new Float32Array(textureSize * textureSize * 3);
    for (let i = 0; i < array.length; i++) {
      let max = textureSize * textureSize;

      const element = array[i];
    }

    // pointMaterial = new THREE.ShaderMaterial({
    //   uniform: {
    //     u_positions1: { value: null },
    //     u_positions2: { value: null },
    //     u_colors1: { value: null },
    //     u_colors2: { value: null },
    //     u_transition: { value: 0 },
    //     u_time: { value: 0 },
    //     u_pointTexture: { value: textureLoader.load('./resources/textures/dot.png') },
    //     blending: THREE.AdditiveBlending,
    //     depthTest: false,
    //     transparent: true,
    //     vertexColor: true,
    //   },
    //   vertexShader: vertexShader,
    //   fragmentShader: fragmentShader,
    // });
    // scene.add(particleGroup);
  };

  // Scroll -------------------
  const onScroll = function () {
    const scrollTop = window.scrollY;
    const maxScrollTop = (document.body.scrollHeight || document.documentElement.scrollHeight) - wh;
    Timeline.progress(scrollTop / maxScrollTop);
  };

  // Render -------------------
  const renderRequest = function () {
    isRequestRender = true;
  };

  const render = function () {
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

// https://stackoverflow.com/a/35111029
function nearestPowerOfTwoCeil(v) {
  var p = 2;
  while ((v >>= 1)) {
    p <<= 1;
  }
  return p;
}
