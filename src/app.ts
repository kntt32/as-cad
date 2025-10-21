import { Formatter, ParseError, Parser, Source } from "./parser.ts";
import { ShapeBuilder } from "./shapes.ts";
import * as ace from "ace-builds";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default class App {
  editor: ace.Editor;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;

  constructor() {
    const { editor, renderer, scene, camera } = App.initDom();
    this.editor = editor;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.initEvents();

    this.run();
  }

  private initEvents() {
    this.editor.session.on(
      "change",
      debounce(() => {
        this.run();
      }),
    );

    const formatButton = unwrap(document.getElementById("formatButton"));
    formatButton.onclick = () => {
      this.format();
    };

    const downloadButton = unwrap(document.getElementById("downloadButton"));
    downloadButton.onclick = () => {
      const stl = this.run();
      if (stl != undefined) {
        App.downloadFile("main.stl", "application/stl", stl);
      }
    };

    globalThis.addEventListener("resize", () => {
      this.resizePreview();
      this.run();
    });
  }

  private static initEditor() {
    const editor = ace.edit("editor");
    editor.setOptions({
      fontSize: "16px",
      tabSize: 2,
      useSoftTabs: true,
    });
    editor.setTheme("ace/theme/github");
    return editor;
  }

  private static initRenderer(): {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
  } {
    const canvas = unwrap(
      document.getElementById("previewCanvas"),
    ) as HTMLCanvasElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(width, height, false);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();

    return { renderer, scene, camera };
  }

  private static initDom(): {
    editor: ace.Editor;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
  } {
    const root = unwrap(document.getElementById("root"));
    root.innerHTML = `
        <div class="container">
          <div id="editor" class="pane">translate(-20, 0, 0) {
  subtract {
    cube(10, 10, 10, true);
    sphere(6);
  }
}
intersect {
  cube(10, 10, 10, true);
  sphere(6);
}
translate(20, 0, 0) {
  extrude_helical(6.28, 6) {
    translate(3, 2.5, 0) {
      circle(2);
    }
  }
}</div>
          <div class="h-divider"></div>
          <div id="preview" class="pane">
            <canvas id="previewCanvas"></canvas>
            <button id="formatButton">
              <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4 4H20M13 12H20M4 20H20M13 8H20M13 16H20M8 12L4 9V15L8 12Z" stroke="#000000" stroke-width="2.5" stroke-linejoin="round"/>
</svg>
            </button>
            <button id="downloadButton">
              <svg width="20px" height="20px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 92 92" enable-background="new 0 0 92 92" xml:space="preserve" fill="#000000">
<path id="XMLID_1335_" d="M89,58.8V86c0,2.8-2.2,5-5,5H8c-2.8,0-5-2.2-5-5V58.8c0-2.8,2.2-5,5-5s5,2.2,5,5V81h66V58.8&#xA;&#9;c0-2.8,2.2-5,5-5S89,56,89,58.8z M42.4,65c0.9,1,2.2,1.5,3.6,1.5s2.6-0.5,3.6-1.5l19.9-20.4c1.9-2,1.9-5.1-0.1-7.1&#xA;&#9;c-2-1.9-5.1-1.9-7.1,0.1L51,49.3V6c0-2.8-2.2-5-5-5s-5,2.2-5,5v43.3L29.6,37.7c-1.9-2-5.1-2-7.1-0.1c-2,1.9-2,5.1-0.1,7.1L42.4,65z" fill="#000000"/></svg>
            </button>
            <button id="infoButton" popovertarget="infoView">
              <svg width="20px" height="20px" xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 24 24" fill="#000000"><path d="M10 20C4.477 20 0 15.523 0 10S4.477 0 10 0s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-10a1 1 0 0 1 1 1v5a1 1 0 0 1-2 0V9a1 1 0 0 1 1-1zm0-1a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" fill="#000000"/></svg>
            </button>
          </div>
        </div>
        <div id="errorView" class="hiddenErrorView"></div>
        <div id="infoView" popover>
          <h1>as-cad</h1>
          as-cad is a web-based declarative CAD.
          <h2>Example</h2>
          <pre>
<code>translate(-20, 0, 0) {
  subtract {
    cube(10, 10, 10, true);
    sphere(6);
  }
}
intersect {
  cube(10, 10, 10, true);
  sphere(6);
}
translate(20, 0, 0) {
  extrude_helical(6.28, 6) {
    translate(3, 2.5, 0) {
      circle(2);
    }
  }
}</code>
          </pre>
          <h2>Primitive</h2>
            <ul>
              <li><code>cube(<i>width</i>, <i>height (optional)</i>, <i>depth (optional)</i>, <i>center (optional)</i>);</code></li>
              <li><code>sphere(<i>radius</i>, <i>segments (optional)</i>);</code></li>
              <li><code>cylinder(<i>radius</i>, <i>height</i>, <i>segments (optional)</i>);</code></li>
              <li><code>union {..<i>Solid</i>}</code></li>
              <li><code>subtract {..<i>Solid</i>}</code></li>
              <li><code>intersect {..<i>Solid</i>}</code></li>
              <li><code>translate(<i>x</i>, <i>y</i>, <i>z</i>) {..<i>Solid/Sketch</i>}</code></li>
              <li><code>rotate(<i>angle_x</i>, <i>angle_y</i>, <i>angle_z</i>) {..<i>Solid/Sketch</i>}</code></li>
              <li><code>scale(<i>x</i>, <i>y (optional)</i>, <i>z (optional)</i>) {..<i>Solid/Sketch</i>}</code></li>
              <li><code>assemble {..<i>Solid</i>}</code></li>
              <li><code>extrude(<i>height</i>) {..<i>Sketch</i>}</code></li>
              <li><code>extrude_helical(<i>angle</i>, <i>pitch</i>, <i>segments (optional)</i>) {..<i>Sketch</i>}</code></li>
              <li><code>circle(<i>radius</i>, <i>segments (optional)</i>);</code></li>
              <li><code>rect(<i>width</i>, <i>height (optional)</i>);</code></li>
              <li><code>triangle(<i>len1 (optional)</i>, <i>len2 (optional)</i>, <i>len3 (optional)</i>);</code></li>
            </ul>
          <h2>Syntax</h2>
            <h3>Shape</h3>
              <pre><code>cube(10, 10, 10);</code></pre>
            <h3>Module</h3>
              <pre><code>as my_module(x) {
  sphere(x);
}</code></pre>
            <h3>Const</h3>
              <pre><code>const MY_CONST = 123;</code></pre>
            <h3>Comment</h3>
              <pre><code>// This is Comment
/*
This is comment, too!
*/</code></pre>
          <div class="sign">build by <a href="https://github.com/kntt32/">kntt32</a></div>
        </div>
        `;
    const editor = this.initEditor();
    const { renderer, scene, camera } = App.initRenderer();
    return { editor, renderer, scene, camera };
  }

  format() {
    const text = this.editor.getValue();
    try {
      const source = new Source("main.acd", text);
      const formatter = new Formatter(source);
      this.editor.setValue(formatter.format());
    } catch (error: unknown) {
      if (error instanceof ParseError) {
        App.raiseError(error);
      } else {
        App.raiseInternalError(error);
      }
    }
  }

  run(): Uint8Array | undefined {
    const text = this.editor.getValue();
    try {
      const source = new Source("main.acd", text);
      const parser = new Parser(source);
      const shapeBuilder = new ShapeBuilder(parser.parse());
      const shape = shapeBuilder.assemble();
      const stl = shape.toStl();
      App.closeError();
      this.renderPreview(stl);
      return stl;
    } catch (error: unknown) {
      if (error instanceof ParseError) {
        App.raiseError(error);
      } else {
        App.raiseInternalError(error);
      }
      return undefined;
    }
  }

  renderPreview(stl: Uint8Array) {
    const stlLoader = new STLLoader();
    const geometry = stlLoader.parse(stl.slice().buffer);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
    this.scene.clear();
    this.scene.add(mesh);
  }

  resizePreview() {
    const canvas = unwrap(
      document.getElementById("previewCanvas"),
    ) as HTMLCanvasElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  static raiseError(parseError: ParseError) {
    const element = unwrap(document.getElementById("errorView"));
    const offset = parseError.offset;
    const msg =
      `${offset.name}:${offset.line}:${offset.column}: ${parseError.msg}`;
    element.innerHTML = msg;
    element.className = "";
  }

  static raiseInternalError(error: unknown) {
    const element = unwrap(document.getElementById("errorView"));
    element.innerHTML = `InternalError: ${error}`;
    element.className = "";
  }

  static closeError() {
    const element = unwrap(document.getElementById("errorView"));
    element.innerHTML = "";
    element.className = "hiddenErrorView";
  }

  static downloadFile(name: string, type: string, data: Uint8Array) {
    const blob = new Blob([data.slice().buffer], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function debounce(func: () => void, wait: number = 200) {
  let timeout: number | undefined = undefined;
  return function () {
    if (timeout != undefined) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(), wait);
  };
}

function unwrap<T>(value: T | undefined | null): T {
  if (value === null || value === undefined) {
    throw new Error("undefined or null value detected");
  }
  return value;
}
