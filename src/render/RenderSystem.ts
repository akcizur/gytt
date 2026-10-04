import * as T from "three";

export class RenderSystem {
  readonly renderer: T.WebGLRenderer;
  readonly camera: T.PerspectiveCamera;

  private readonly resizeObserver: ResizeObserver;
  private readonly onContextLost = (event: Event) => {
    event.preventDefault();
    this.contextLost = true;
  };
  private readonly onContextRestored = () => {
    this.contextLost = false;
  };
  private contextLost = false;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;

    this.camera = new T.PerspectiveCamera(62, 1, 0.05, 500);
    this.resize();

    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    canvas.addEventListener("webglcontextrestored", this.onContextRestored, false);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  get canRender() {
    return !this.contextLost;
  }

  render(scene: T.Scene) {
    if (!this.canRender) return;
    this.renderer.render(scene, this.camera);
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onContextRestored);
    this.renderer.dispose();
  }
}
