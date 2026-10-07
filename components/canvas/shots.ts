import * as THREE from 'three'
import { DIE } from './board/layout'

/** Kamera durakları. Konumlar her dünyanın kendi koordinatındadır. */
export interface Pose {
  pos: THREE.Vector3
  target: THREE.Vector3
  fov: number
  /** alan derinliği odak uzaklığı (dünya birimi); 0 → hedefe olan uzaklık */
  focus?: number
  /** odak aralığı (dünya birimi) */
  range?: number
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const pose = (pos: THREE.Vector3, target: THREE.Vector3, fov: number, range = 0): Pose => ({ pos, target, fov, range })

export const BOARD_SHOTS = {
  standby: pose(v(15.6, 4.4, 15.1), v(10.45, 0.15, 7.7), 26, 3.2),
  reveal: pose(v(13.2, 7.2, 17.4), v(7.6, 0.2, 4.4), 30, 9),
  clock: pose(v(1.1, 3.4, 7.6), v(3.45, 0.95, 2.6), 30, 2.6),
  crane: pose(v(5.0, 13.5, 19.5), v(-0.6, 0.0, 0.6), 33, 14),
  hero: pose(v(-0.6, 19.2, 22.8), v(-4.2, 0.4, -0.4), 33, 16),
  preDive: pose(v(-0.4, 9.5, 9.0), v(DIE.x, DIE.y, DIE.z), 33, 5),
  dive: pose(v(DIE.x, 2.18, DIE.z + 0.0005), v(DIE.x, DIE.y, DIE.z), 33, 1.0),
  shutdown: pose(v(0.6, 26, 15.5), v(-0.4, 0.0, 0.4), 34, 18),
  collapse: pose(v(10.2, 6.5, 13.4), v(11.0, 0.07, 7.95), 30, 3),
}

/** Çipe dalışın bittiği an şehir kamerası: tepeden, kalıbı aynı oranla dolduran yükseklik. */
export const CITY_ENTRY_HEIGHT = (BOARD_SHOTS.dive.pos.y - DIE.y) * (72 / DIE.d)

/** Geliştirme: kamerayı elle sabitlemek için (`__mfk.shot([x,y,z],[x,y,z],fov)`). */
export const debugShot: { pose: Pose | null; camera: THREE.Camera | null; gl: THREE.WebGLRenderer | null } = { pose: null, camera: null, gl: null }
