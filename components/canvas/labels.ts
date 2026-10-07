import * as THREE from 'three'
import type { WorldId } from './uniforms'

/**
 * 3B noktalara bağlı HTML etiketleri. Etiket metni DOM'da kalır (keskin tipografi, erişilebilir),
 * konumu her karede kameradan izdüşürülür.
 */

export interface LabelDef {
  el: HTMLElement
  world: WorldId
  pos: THREE.Vector3
  /** film zamanına göre görünürlük (0..1) */
  visible: (F: number) => number
  /** konumu her karede güncellemek için (örn. imleçle birlikte kayan etiketler) */
  update?: (pos: THREE.Vector3) => void
}

const v = new THREE.Vector3()

class LabelSystem {
  private items = new Map<string, LabelDef>()

  set(id: string, def: LabelDef) {
    this.items.set(id, def)
  }

  remove(id: string) {
    this.items.delete(id)
  }

  update(camera: THREE.Camera, world: WorldId, F: number, w: number, h: number) {
    for (const item of this.items.values()) {
      let o = item.world === world ? item.visible(F) : 0
      if (o > 0.001) {
        item.update?.(item.pos)
        v.copy(item.pos).project(camera)
        if (v.z > 1 || v.z < -1) o = 0
        const x = (v.x * 0.5 + 0.5) * w
        const y = (-v.y * 0.5 + 0.5) * h
        item.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      }
      const s = o.toFixed(3)
      if (item.el.style.opacity !== s) item.el.style.opacity = s
      item.el.style.visibility = o > 0.001 ? 'visible' : 'hidden'
    }
  }
}

export const labels = new LabelSystem()
