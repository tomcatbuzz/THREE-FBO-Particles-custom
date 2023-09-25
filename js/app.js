import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";

import simFragment from "./shaders/simFragment.glsl";
import simVertex from "./shaders/simVertex.glsl";
import GUI from 'lil-gui';

import t1 from '../logo.png'
import t2 from '../super.png'
import texture from "../test.jpg";

// import bird from "../bird.glb?url"
import bird from "../bird1.glb?url"

function lerp(a, b, n) {
  return (1 - n) * a + n * b;
}

const loadImage = path => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous' // to avoid CORS if used with Canvas
    img.src = path
    img.onload = () => {
      resolve(img)
    }
    img.onerror = e => {
      reject(e)
    }
  })
}

export default class Sketch {
  constructor(options) {
    this.init = false;
    this.v = new THREE.Vector3(0, 0, 0)
    this.v1 = new THREE.Vector3(0, 0, 0)
    this.currentParticles = 0;
    this.size = 256;
    this.number = this.size * this.size;
    this.container = options.dom;
    this.scene = new THREE.Scene();

    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.renderer.setClearColor(0x222222, 1);
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      100
    );
    this.camera.position.z = 2;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.loader = new GLTFLoader();

    this.time = 0;
    this.setupSettings();
    this.emitters = [];
    Promise.all([
      // this.getPixelDataFromImage(t1), 
      // this.getPixelDataFromImage(t2)
      this.loader.loadAsync(bird),
    ]).then(([model]) => {
      this.model = model.scene
      this.scene.add(this.model)

      this.model.traverse(m => {
        if(m.isMesh && m.name.includes('emitter')) {
          this.emitters.push({
            mesh: m,
            prev: m.position.clone(), 
            dir: new THREE.Vector3(0, 0, 0)
          })
          m.visible = false;
          m.material = new THREE.MeshBasicMaterial({
            color: 0xff0000
          })
        }
      })

      this.mixer = new THREE.AnimationMixer(this.model);
      this.mixer.clipAction(model.animations[0]).play();
      this.data1 = this.getPointsOnSphere();
      this.data2 = this.getPointsOnSphere();
      this.getPixelDataFromImage(t1);
      this.mouseEvents();
      this.getButtonAction();
      this.setupFBO();
      this.addObjects();
      this.setupResize();
      this.render();
    })
  }

  setupSettings(){
    this.settings = {
      progress: 0
    }

    this.gui = new GUI();
    this.gui.add(this.settings, 'progress', 0, 1, 0.01).onChange(val=>{
      this.simMaterial.uniforms.uProgress.value = val
    })
  }

  getButtonAction() {
    const button = document.querySelector("button");
    button.addEventListener("click", event => {
    this.getSoundClip()
    // button.remove();
    });
  }

  // create an AudioListener and add it to the camera
  getSoundClip() {
    const listener = new THREE.AudioListener();
    this.camera.add( listener );
  
    // create a global audio source
    const sound = new THREE.Audio( listener );
  
    // load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load( '../Haunting Dreams.mp3', function( buffer ) {
    sound.setBuffer( buffer );
    sound.setLoop( true );
    sound.setVolume( 0.5 );
    // sound.autoplay( true );
    sound.play();
    // scene.add(sound)
    });
  }

  getPointsOnSphere() {
    const data = new Float32Array(4 * this.number);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;

        // generate point on a sphere
        let theta = Math.random() * Math.PI * 2;
        let phi = Math.acos(Math.random() * 2 - 1); // 
        // let phi = Math.random()*Math.PI; // 
        let x = Math.sin(phi) * Math.cos(theta);
        let y = Math.sin(phi) * Math.sin(theta);
        let z = Math.cos(phi);
        
        data[4 * index] = x;
        data[4 * index + 1] = y;
        data[4 * index + 2] = z;
        data[4 * index + 3] = (Math.random()-0.5)*0.01;
      }
    }

    let dataTexture = new THREE.DataTexture(
      data,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    dataTexture.needsUpdate = true;

    return dataTexture
  }

  async getPixelDataFromImage(url) {
    let img = await loadImage(url);
    let width = 200;
    let canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = width;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, width);
    let canvasData = ctx.getImageData(0, 0, width, width).data;

    let pixels = [];
    for (let i = 0; i < canvasData.length; i += 4) {
      let x = (i / 4) % width;
      let y = Math.floor((i / 4) / width);
      if(canvasData[i] <5) {
        pixels.push({x: x/width - 0.5, y: 0.5 - y/width })
      }
    }

    const data = new Float32Array(4 * this.number);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        let randomPixel = pixels[Math.floor(Math.random() * pixels.length)]
        if(Math.random()>0.9){
          randomPixel = {x: 3*(Math.random() - 0.5), y: 3*(Math.random() - 0.5)}
        }
        data[4 * index] = randomPixel.x + (Math.random()-0.5)*0.01;
        data[4 * index + 1] = randomPixel.y + (Math.random()-0.5)*0.01;
        data[4 * index + 2] = (Math.random()-0.5)*0.01;
        data[4 * index + 3] = (Math.random()-0.5)*0.01;
      }
    }

    let dataTexture = new THREE.DataTexture(
      data,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    dataTexture.needsUpdate = true;

    return dataTexture
  }

  mouseEvents() {
    this.planeMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 30,30),
        new THREE.MeshBasicMaterial()
    )
    this.dummy = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 32, 32),
        new THREE.MeshNormalMaterial()
    )
    this.scene.add(this.dummy)
    window.addEventListener("mousemove", (e) => {
      this.pointer.x = (e.clientX / this.width) * 2 - 1;
      this.pointer.y = -(e.clientY / this.height) * 2 + 1;
      this.raycaster.setFromCamera( this.pointer, this.camera );

      const intersects = this.raycaster.intersectObjects( [this.planeMesh] );
        if (intersects.length > 0) {
            // console.log(intersects[0].point)
            this.dummy.position.copy(intersects[0].point)
            this.simMaterial.uniforms.uMouse.value = intersects[0].point
        }
    });
  }

  setupResize() {
    window.addEventListener("resize", this.resize.bind(this));
  }

  // can be deleted 
  // setupFBO() {
  //   // create data Texture
  //   const data = new Float32Array(4 * this.number);
  //   for (let i = 0; i < this.size; i++) {
  //     for (let j = 0; j < this.size; j++) {
  //       const index = i * this.size + j;
  //       data[4 * index] = lerp(-0.5, 0.5, j / (this.size - 1));
  //       data[4 * index + 1] = lerp(-0.5, 0.5, i / (this.size - 1));
  //       data[4 * index + 2] = 0;
  //       data[4 * index + 3] = 1;
  //     }
  //   }

  //   this.positions = new THREE.DataTexture(
  //     data,
  //     this.size,
  //     this.size,
  //     THREE.RGBAFormat,
  //     THREE.FloatType
  //   );
  //   this.positions.needsUpdate = true;

  //   // create FBO scene
  //   this.sceneFBO = new THREE.Scene();
  //   this.cameraFBO = new THREE.OrthographicCamera(-1, 1, 1, -1, -2, 2);
  //   this.cameraFBO.position.z = 1;
  //   this.cameraFBO.lookAt(new THREE.Vector3(0,0,0));

  //   let geo = new THREE.PlaneGeometry(2,2,2,2);
  //   this.simMaterial = new THREE.MeshBasicMaterial({
  //       color: 0xff0000,
  //       wireframe: true
  //   })
  //   this.simMaterial = new THREE.ShaderMaterial({
  //       uniforms: {
  //           time: { value: 0 },
  //           uMouse: { value: new THREE.Vector3(0,0,0) },
  //           uProgress: { value: 0 },
  //           uTime: { value: 0 },
  //           uSource: { value: new THREE.Vector3(0,0,0) },
  //           uRenderMode: { value: 0 },
  //           uCurrentPosition: { value: this.data1 },
  //           uDirections: { value: null },
  //       },
  //       vertexShader: simVertex,
  //       fragmentShader: simFragment,
  //   })
  //   this.simMesh = new THREE.Mesh(geo, this.simMaterial);
  //   this.sceneFBO.add(this.simMesh);

  //   this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
  //       minFilter: THREE.NearestFilter,
  //       magFilter: THREE.NearestFilter,
  //       format: THREE.RGBAFormat,
  //       type: THREE.FloatType,
  //   })

  //   this.directions = new THREE.WebGLRenderTarget(this.size, this.size, {
  //     minFilter: THREE.NearestFilter,
  //     magFilter: THREE.NearestFilter,
  //     format: THREE.RGBAFormat,
  //     type: THREE.FloatType,
  //   })

  //   this.initPos = new THREE.WebGLRenderTarget(this.size, this.size, {
  //     minFilter: THREE.NearestFilter,
  //     magFilter: THREE.NearestFilter,
  //     format: THREE.RGBAFormat,
  //     type: THREE.FloatType,
  //   })

  //   this.renderTarget1 = new THREE.WebGLRenderTarget(this.size, this.size, {
  //       minFilter: THREE.NearestFilter,
  //       magFilter: THREE.NearestFilter,
  //       format: THREE.RGBAFormat,
  //       type: THREE.FloatType,
  //   })
  // }

  setupFBO() {
    // create data Texture
    const data = new Float32Array(4 * this.number);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        data[4 * index] = lerp(-0.5, 0.5, j / (this.size - 1));
        data[4 * index + 1] = lerp(-0.5, 0.5, i / (this.size - 1));
        data[4 * index + 2] = 0;
        data[4 * index + 3] = 1;
      }
    }

    this.positions = new THREE.DataTexture(
      data,
      this.size,
      this.size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.positions.needsUpdate = true;

    // create FBO scene
    this.sceneFBO = new THREE.Scene();
    let viewArea = this.size / 2 + 0.01
    this.cameraFBO = new THREE.OrthographicCamera(-viewArea, viewArea, viewArea, -viewArea, -2, 2);
    this.cameraFBO.position.z = 1;
    this.cameraFBO.lookAt(new THREE.Vector3(0,0,0));

    let geo = new THREE.PlaneGeometry(2,2,2,2);
    this.geo = new THREE.BufferGeometry();
    let pos = new Float32Array(this.number * 3);
    let uv = new Float32Array(this.number * 2);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;

        pos[3 * index] = this.size*lerp(-0.5, 0.5, j / (this.size - 1));
        pos[3 * index + 1] = this.size*lerp(-0.5, 0.5, i / (this.size - 1));
        pos[3 * index + 2] = 0;

        uv[2 * index] = j / (this.size - 1);
        uv[2 * index + 1] = i / (this.size - 1);
      }
    }
    this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));

    // this.geo.setDrawRange(3, 10);

    this.simMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            uMouse: { value: new THREE.Vector3(0,0,0) },
            uProgress: { value: 0 },
            uTime: { value: 0 },
            uSource: { value: new THREE.Vector3(0,0,0) },
            uRenderMode: { value: 0 },
            uCurrentPosition: { value: this.data1 },
            uDirections: { value: null },
        },
        vertexShader: simVertex,
        fragmentShader: simFragment,
    })
    this.simMesh = new THREE.Points(this.geo, this.simMaterial);
    this.sceneFBO.add(this.simMesh);

    this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    })

    this.directions = new THREE.WebGLRenderTarget(this.size, this.size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    })

    this.initPos = new THREE.WebGLRenderTarget(this.size, this.size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    })

    this.renderTarget1 = new THREE.WebGLRenderTarget(this.size, this.size, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
    })
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    this.camera.updateProjectionMatrix();
  }

  addObjects() {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.number * 3);
    const uvs = new Float32Array(this.number * 2);
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const index = i * this.size + j;

        positions[3 * index] = j / this.size - 0.5;
        positions[3 * index + 1] = i / this.size - 0.5;
        positions[3 * index + 2] = 0;
        uvs[2 * index] = j / (this.size - 1);
        uvs[2 * index + 1] = i / (this.size - 1);
      }
    }
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    this.geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    this.material = new THREE.MeshNormalMaterial();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        // uTexture: { value: new THREE.TextureLoader().load(texture) },
        uTexture: { value: this.positions },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.mesh);

    // Debug Plane
    this.debugPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 1, 1),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(t1)
      })
    );
    // this.scene.add(this.debugPlane);

    this.emitter = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({
        color: 0xff0000
      })
    );
    // this.scene.add(this.emitter);

    this.emitterDir = new THREE.Vector3(0, 0, 0)
    this.emitterPrev = new THREE.Vector3(0, 0, 0)
  }

  moveEmitter() {
    this.emitter.position.x = Math.sin(this.time) * 0.5;
  }

  render() {
    this.time += 0.05;
    this.moveEmitter();
    if(!this.init) {
      this.init = true;
      // Directions
      this.simMaterial.uniforms.uRenderMode.value = 1;
      this.simMaterial.uniforms.uTime.value = -100;
      this.simMaterial.uniforms.uSource.value = new THREE.Vector3(0, -1, 0)
      this.renderer.setRenderTarget(this.directions);
      this.renderer.render(this.sceneFBO, this.cameraFBO);
      this.simMaterial.uniforms.uDirections.value = this.directions.texture;

      // Positions
      this.simMaterial.uniforms.uRenderMode.value = 2;
      this.simMaterial.uniforms.uSource.value = new THREE.Vector3(0, 0, 0)
      this.renderer.setRenderTarget(this.initPos);
      this.renderer.render(this.sceneFBO, this.cameraFBO);
      this.simMaterial.uniforms.uCurrentPosition.value = this.initPos.texture;
    }

    this.material.uniforms.time.value = this.time;

    // Simulation
    this.simMaterial.uniforms.uDirections.value = this.directions.texture;
    this.simMaterial.uniforms.uRenderMode.value = 0;
    this.geo.setDrawRange(0, this.number);
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.sceneFBO, this.cameraFBO);

    // Begin Emitter
    let emit = 5;
    this.renderer.autoClear = false;

    this.emitters.forEach((emitter) => {
      emitter.mesh.getWorldPosition(this.v);
      this.v1 = this.v.clone()
      let flip = Math.random()>0.5;

      emitter.dir = this.v
        .clone()
        .sub(emitter.prev)
        .multiplyScalar(100)
      this.geo.setDrawRange(this.currentParticles, emit);
    

      // Directions
      this.simMaterial.uniforms.uRenderMode.value = 1;
      this.simMaterial.uniforms.uDirections.value = null;
      this.simMaterial.uniforms.uCurrentPosition.value = null;
      if(flip) {
        emitter.dir.x *=-1;
      }
      this.simMaterial.uniforms.uSource.value = emitter.dir;
      this.renderer.setRenderTarget(this.directions);
      this.renderer.render(this.sceneFBO, this.cameraFBO);
    

      // Positions
      this.simMaterial.uniforms.uRenderMode.value = 2;
      if(flip) {
        this.v1.x *=-1
      }
      this.simMaterial.uniforms.uSource.value = this.v1;
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.render(this.sceneFBO, this.cameraFBO);
 

      this.currentParticles += emit;
      if (this.currentParticles > this.number) {
        this.currentParticles = 0;
      }
    
      emitter.prev = this.v.clone();
    })
    
    this.renderer.autoClear = true;
    // End of Emitter

    // Render scene
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);

    // swap render targets
    const tmp = this.renderTarget;
    this.renderTarget = this.renderTarget1;
    this.renderTarget1 = tmp;


    this.material.uniforms.uTexture.value = this.renderTarget.texture;
    this.simMaterial.uniforms.uCurrentPosition.value = this.renderTarget1.texture;
    this.simMaterial.uniforms.uTime.value = this.time;

    this.debugPlane.material.map = this.renderTarget.texture;

    window.requestAnimationFrame(this.render.bind(this));

    if(this.mixer) {
      this.mixer.update(0.01)
    }
  }
}

new Sketch({
  dom: document.getElementById("container"),
});
