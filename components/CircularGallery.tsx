// src/components/CircularGallery.tsx - Адаптированная галерея для режимов игры

"use client";

import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from "ogl";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

type GL = Renderer["gl"];

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
    let timeout: number;
    return function (this: any, ...args: Parameters<T>) {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
}

function lerp(p1: number, p2: number, t: number): number {
    return p1 + (p2 - p1) * t;
}

function autoBind(instance: any): void {
    const proto = Object.getPrototypeOf(instance);
    Object.getOwnPropertyNames(proto).forEach((key) => {
        if (key !== "constructor" && typeof instance[key] === "function") {
            instance[key] = instance[key].bind(instance);
        }
    });
}

interface ScreenSize {
    width: number;
    height: number;
}

interface Viewport {
    width: number;
    height: number;
}

interface MediaProps {
    geometry: Plane;
    gl: GL;
    image: string;
    index: number;
    length: number;
    renderer: Renderer;
    scene: Transform;
    screen: ScreenSize;
    viewport: Viewport;
    bend: number;
    borderRadius?: number;
}

class Media {
    extra: number = 0;
    geometry: Plane;
    gl: GL;
    image: string;
    index: number;
    length: number;
    renderer: Renderer;
    scene: Transform;
    screen: ScreenSize;
    viewport: Viewport;
    bend: number;
    borderRadius: number;
    program!: Program;
    plane!: Mesh;
    scale!: number;
    padding!: number;
    width!: number;
    widthTotal!: number;
    x!: number;
    speed: number = 0;
    isBefore: boolean = false;
    isAfter: boolean = false;

    constructor({
        geometry,
        gl,
        image,
        index,
        length,
        renderer,
        scene,
        screen,
        viewport,
        bend,
        borderRadius = 0,
    }: MediaProps) {
        this.geometry = geometry;
        this.gl = gl;
        this.image = image;
        this.index = index;
        this.length = length;
        this.renderer = renderer;
        this.scene = scene;
        this.screen = screen;
        this.viewport = viewport;
        this.bend = bend;
        this.borderRadius = borderRadius;
        this.createShader();
        this.createMesh();
        this.onResize();
    }

    createShader() {
        const texture = new Texture(this.gl, { generateMipmaps: false });
        this.program = new Program(this.gl, {
            depthTest: false,
            depthWrite: false,
            vertex: `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uTime;
        uniform float uSpeed;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          // Более мягкая волновая анимация для игрового интерфейса
          p.z = (sin(p.x * 2.0 + uTime * 0.5) * 0.5 + cos(p.y * 1.0 + uTime * 0.3) * 0.5) * (0.05 + uSpeed * 0.2);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
            fragment: `
        precision highp float;
        uniform vec2 uImageSizes;
        uniform vec2 uPlaneSizes;
        uniform sampler2D tMap;
        uniform float uBorderRadius;
        uniform float uTime;
        varying vec2 vUv;
        
        float roundedBoxSDF(vec2 p, vec2 b, float r) {
          vec2 d = abs(p) - b;
          return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
        }
        
        void main() {
          vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
          );
          vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
          );
          vec4 color = texture2D(tMap, uv);
          
          // Округленные углы
          float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
          if(d > 0.0) {
            discard;
          }
          
          // Мягкое свечение по краям для игрового эффекта
          float edge = 1.0 - smoothstep(-0.02, 0.0, d);
          color.rgb += edge * 0.1;
          
          gl_FragColor = vec4(color.rgb, 1.0);
        }
      `,
            uniforms: {
                tMap: { value: texture },
                uPlaneSizes: { value: [0, 0] },
                uImageSizes: { value: [0, 0] },
                uSpeed: { value: 0 },
                uTime: { value: 100 * Math.random() },
                uBorderRadius: { value: this.borderRadius },
            },
            transparent: true,
        });

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = this.image;
        img.onload = () => {
            texture.image = img;
            this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
        };
    }

    createMesh() {
        this.plane = new Mesh(this.gl, {
            geometry: this.geometry,
            program: this.program,
        });
        this.plane.setParent(this.scene);
    }

    update(scroll: { current: number; last: number }, direction: "right" | "left") {
        this.plane.position.x = this.x - scroll.current - this.extra;

        const x = this.plane.position.x;
        const H = this.viewport.width / 2;

        if (this.bend === 0) {
            this.plane.position.y = 0;
            this.plane.rotation.z = 0;
        } else {
            const B_abs = Math.abs(this.bend);
            const R = (H * H + B_abs * B_abs) / (2 * B_abs);
            const effectiveX = Math.min(Math.abs(x), H);

            const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
            if (this.bend > 0) {
                this.plane.position.y = -arc;
                this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
            } else {
                this.plane.position.y = arc;
                this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
            }
        }

        this.speed = scroll.current - scroll.last;
        this.program.uniforms.uTime.value += 0.02; // Замедленная анимация
        this.program.uniforms.uSpeed.value = this.speed;

        const planeOffset = this.plane.scale.x / 2;
        const viewportOffset = this.viewport.width / 2;
        this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
        this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
        if (direction === "right" && this.isBefore) {
            this.extra -= this.widthTotal;
            this.isBefore = this.isAfter = false;
        }
        if (direction === "left" && this.isAfter) {
            this.extra += this.widthTotal;
            this.isBefore = this.isAfter = false;
        }
    }

    onResize({ screen, viewport }: { screen?: ScreenSize; viewport?: Viewport } = {}) {
        if (screen) this.screen = screen;
        if (viewport) {
            this.viewport = viewport;
        }

        // Адаптируем размеры для игрового интерфейса
        this.scale = this.screen.height / 1200;
        this.plane.scale.y = (this.viewport.height * (700 * this.scale)) / this.screen.height;
        this.plane.scale.x = (this.viewport.width * (500 * this.scale)) / this.screen.width;
        this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
        this.padding = 1.5;
        this.width = this.plane.scale.x + this.padding;
        this.widthTotal = this.width * this.length;
        this.x = this.width * this.index;
    }
}

interface AppConfig {
    items?: { image: string; text: string }[];
    bend?: number;
    borderRadius?: number;
    scrollSpeed?: number;
    scrollEase?: number;
    onCurrentIndexChange?: (index: number) => void;
}

interface GalleryRef {
    scrollToIndex: (index: number) => void;
    getCurrentIndex: () => number;
}

class App {
    container: HTMLElement;
    scrollSpeed: number;
    onCurrentIndexChange?: (index: number) => void;
    scroll: {
        ease: number;
        current: number;
        target: number;
        last: number;
        position?: number;
    };
    onCheckDebounce: (...args: any[]) => void;
    renderer!: Renderer;
    gl!: GL;
    camera!: Camera;
    scene!: Transform;
    planeGeometry!: Plane;
    medias: Media[] = [];
    mediasImages: { image: string; text: string }[] = [];
    screen!: { width: number; height: number };
    viewport!: { width: number; height: number };
    raf: number = 0;
    currentIndex: number = 0;

    boundOnResize!: () => void;
    boundOnWheel!: (e: Event) => void;
    boundOnTouchStart!: (e: TouchEvent) => void;
    boundOnTouchMove!: (e: TouchEvent) => void;
    boundOnTouchEnd!: () => void;

    isDown: boolean = false;
    start: number = 0;

    constructor(
        container: HTMLElement,
        {
            items,
            bend = 1,
            borderRadius = 0,
            scrollSpeed = 2,
            scrollEase = 0.05,
            onCurrentIndexChange,
        }: AppConfig
    ) {
        this.container = container;
        this.scrollSpeed = scrollSpeed;
        this.onCurrentIndexChange = onCurrentIndexChange;
        this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
        this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
        this.createRenderer();
        this.createCamera();
        this.createScene();
        this.onResize();
        this.createGeometry();
        this.createMedias(items, bend, borderRadius);
        this.update();
        this.addEventListeners();
    }

    createRenderer() {
        this.renderer = new Renderer({ alpha: true });
        this.gl = this.renderer.gl;
        this.gl.clearColor(0, 0, 0, 0);
        this.container.appendChild(this.renderer.gl.canvas as HTMLCanvasElement);
    }

    createCamera() {
        this.camera = new Camera(this.gl);
        this.camera.fov = 45;
        this.camera.position.z = 20;
    }

    createScene() {
        this.scene = new Transform();
    }

    createGeometry() {
        this.planeGeometry = new Plane(this.gl, {
            heightSegments: 30,
            widthSegments: 50,
        });
    }

    createMedias(
        items: { image: string; text: string }[] | undefined,
        bend: number = 1,
        borderRadius: number
    ) {
        const defaultItems = [
            { image: "https://notfren.com/circusle/reaction.jpg", text: "reaction" },
            { image: "https://notfren.com/circusle/survival.jpg", text: "survival" },
            { image: "https://notfren.com/circusle/physics.jpg", text: "physics" },
            { image: "https://notfren.com/circusle/rotation.jpg", text: "rotation" },
        ];

        const galleryItems = items && items.length ? items : defaultItems;
        this.mediasImages = galleryItems;
        this.medias = this.mediasImages.map((data, index) => {
            return new Media({
                geometry: this.planeGeometry,
                gl: this.gl,
                image: data.image,
                index,
                length: this.mediasImages.length,
                renderer: this.renderer,
                scene: this.scene,
                screen: this.screen,
                viewport: this.viewport,
                bend,
                borderRadius,
            });
        });
    }

    scrollToIndex(index: number) {
        if (!this.medias || !this.medias[0]) return;
        const width = this.medias[0].width;
        this.scroll.target = width * index;
        this.currentIndex = index;
    }

    getCurrentIndex(): number {
        return this.currentIndex;
    }

    onTouchStart(e: TouchEvent) {
        this.isDown = true;
        this.scroll.position = this.scroll.current;
        this.start = e.touches[0].clientX;
    }

    onTouchMove(e: TouchEvent) {
        if (!this.isDown) return;
        const x = e.touches[0].clientX;
        const distance = (this.start - x) * (this.scrollSpeed * 0.025);
        this.scroll.target = (this.scroll.position ?? 0) + distance;
    }

    onTouchEnd() {
        this.isDown = false;
        this.onCheck();
    }

    onWheel(e: Event) {
        const wheelEvent = e as WheelEvent;
        const delta = wheelEvent.deltaY || (wheelEvent as any).wheelDelta || (wheelEvent as any).detail;
        this.scroll.target += delta > 0 ? this.scrollSpeed : -this.scrollSpeed;
        this.onCheckDebounce();
    }

    onCheck() {
        if (!this.medias || !this.medias[0]) return;
        const width = this.medias[0].width;
        const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
        const item = width * itemIndex;
        this.scroll.target = this.scroll.target < 0 ? -item : item;

        const newIndex = itemIndex % this.mediasImages.length;
        if (newIndex !== this.currentIndex) {
            this.currentIndex = newIndex;
            this.onCurrentIndexChange?.(this.currentIndex);
        }
    }

    onResize() {
        this.screen = {
            width: this.container.clientWidth,
            height: this.container.clientHeight,
        };
        this.renderer.setSize(this.screen.width, this.screen.height);
        this.camera.perspective({
            aspect: this.screen.width / this.screen.height,
        });
        const fov = (this.camera.fov * Math.PI) / 180;
        const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
        const width = height * this.camera.aspect;
        this.viewport = { width, height };
        if (this.medias) {
            this.medias.forEach((media) => media.onResize({ screen: this.screen, viewport: this.viewport }));
        }
    }

    update() {
        this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
        const direction = this.scroll.current > this.scroll.last ? "right" : "left";
        if (this.medias) {
            this.medias.forEach((media) => media.update(this.scroll, direction));
        }
        this.renderer.render({ scene: this.scene, camera: this.camera });
        this.scroll.last = this.scroll.current;
        this.raf = window.requestAnimationFrame(this.update.bind(this));
    }

    addEventListeners() {
        this.boundOnResize = this.onResize.bind(this);
        this.boundOnWheel = this.onWheel.bind(this);
        this.boundOnTouchStart = this.onTouchStart.bind(this);
        this.boundOnTouchMove = this.onTouchMove.bind(this);
        this.boundOnTouchEnd = this.onTouchEnd.bind(this);

        window.addEventListener("resize", this.boundOnResize);
        window.addEventListener("wheel", this.boundOnWheel);
        window.addEventListener("touchstart", this.boundOnTouchStart);
        window.addEventListener("touchmove", this.boundOnTouchMove);
        window.addEventListener("touchend", this.boundOnTouchEnd);
    }

    destroy() {
        window.cancelAnimationFrame(this.raf);
        window.removeEventListener("resize", this.boundOnResize);
        window.removeEventListener("wheel", this.boundOnWheel);
        window.removeEventListener("touchstart", this.boundOnTouchStart);
        window.removeEventListener("touchmove", this.boundOnTouchMove);
        window.removeEventListener("touchend", this.boundOnTouchEnd);
        if (this.renderer && this.renderer.gl && this.renderer.gl.canvas.parentNode) {
            this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas as HTMLCanvasElement);
        }
    }
}

interface CircularGalleryProps {
    items?: { image: string; text: string }[];
    bend?: number;
    borderRadius?: number;
    scrollSpeed?: number;
    scrollEase?: number;
    onCurrentIndexChange?: (index: number) => void;
    currentIndex?: number;
}

const CircularGallery = forwardRef<GalleryRef, CircularGalleryProps>(({
    items,
    bend = 3,
    borderRadius = 0.05,
    scrollSpeed = 2,
    scrollEase = 0.05,
    onCurrentIndexChange,
    currentIndex = 0,
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<App | null>(null);

    useImperativeHandle(ref, () => ({
        scrollToIndex: (index: number) => {
            appRef.current?.scrollToIndex(index);
        },
        getCurrentIndex: () => {
            return appRef.current?.getCurrentIndex() ?? 0;
        },
    }));

    useEffect(() => {
        if (!containerRef.current) return;

        appRef.current = new App(containerRef.current, {
            items,
            bend,
            borderRadius,
            scrollSpeed,
            scrollEase,
            onCurrentIndexChange,
        });

        return () => {
            appRef.current?.destroy();
        };
    }, [items, bend, borderRadius, scrollSpeed, scrollEase, onCurrentIndexChange]);

    // Синхронизация внешнего currentIndex с внутренним состоянием
    useEffect(() => {
        if (appRef.current && currentIndex !== appRef.current.getCurrentIndex()) {
            appRef.current.scrollToIndex(currentIndex);
        }
    }, [currentIndex]);

    return (
        <div
            className="w-full h-full overflow-hidden"
            ref={containerRef}
        />
    );
});

CircularGallery.displayName = "CircularGallery";

export default CircularGallery;
export type { GalleryRef };