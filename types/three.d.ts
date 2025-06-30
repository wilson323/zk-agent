/**
 * Three.js 临时类型声明
 * 用于解决构建时的依赖问题
 */

declare module 'three' {
  export class Scene {
    constructor()
    add(object: any): void
    remove(object: any): void
  }
  
  export class PerspectiveCamera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number)
    position: { x: number; y: number; z: number }
    lookAt(x: number, y: number, z: number): void
  }
  
  export class WebGLRenderer {
    constructor(parameters?: { canvas?: HTMLCanvasElement; antialias?: boolean })
    setSize(width: number, height: number): void
    render(scene: Scene, camera: PerspectiveCamera): void
    domElement: HTMLCanvasElement
  }
  
  export class BoxGeometry {
    constructor(width?: number, height?: number, depth?: number)
  }
  
  export class MeshBasicMaterial {
    constructor(parameters?: { color?: number })
  }
  
  export class Mesh {
    constructor(geometry?: any, material?: any)
    rotation: { x: number; y: number; z: number }
  }
  
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number)
    x: number
    y: number
    z: number
  }
  
  export class Color {
    constructor(color?: number | string)
  }
  
  export class AmbientLight {
    constructor(color?: number, intensity?: number)
  }
  
  export class DirectionalLight {
    constructor(color?: number, intensity?: number)
    position: Vector3
  }
}