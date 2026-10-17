import { Mesh, Matrix4, Vector3 } from 'three';
import { createKnife, mountCuttingKnife, loadKnifeTextures } from '@rubenvieira/knife-atelier';

export function meshMaterialGroups(mesh, geometry) {
  const groups = Array.isArray(mesh.material) && geometry.groups.length ? geometry.groups : [{ start: 0, count: geometry.getAttribute('position').count, materialIndex: 0 }];
  const batches = new Map();
  for (const range of groups) {
    const materialIndex = range.materialIndex ?? 0;
    if (!batches.has(materialIndex)) batches.set(materialIndex, { materialIndex, count: 0, ranges: [] });
    const batch = batches.get(materialIndex); batch.count += range.count; batch.ranges.push(range);
  }
  return [...batches.values()];
}

// Main-thread preparation retains the canonical material maps; GPU rendering stays in the cloth worker.
export async function prepareAtelierKnife() {
  await loadKnifeTextures();
  const knife = createKnife('petty', { finish: 'satin', wood: 'walnut' });
  const frame = mountCuttingKnife(knife, { bladeLength: .095, axis: '-x', origin: 'tip' });
  const pose = new Matrix4().makeRotationZ(Math.PI / 4);
  frame.updateMatrixWorld(true);
  const tip = knife.localToWorld(new Vector3(...knife.userData.knifeAtelier.tip)).applyMatrix4(pose);
  pose.setPosition(tip.multiplyScalar(-1));
  const parts = [], transfers = [];
  for (const child of knife.children) {
    if (!(child instanceof Mesh)) continue;
    const geometry = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
    geometry.applyMatrix4(pose.clone().multiply(child.matrixWorld));
    const p = geometry.getAttribute('position'), n = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const group of meshMaterialGroups(child, geometry)) {
      const material = materials[group.materialIndex ?? 0], vertices = new Float32Array(group.count * 8);
      let i = 0;
      for (const range of group.ranges) for (let k = 0; k < range.count; k++, i++) {
        const j = range.start + k;
        vertices.set([p.getX(j), p.getY(j), p.getZ(j), n.getX(j), n.getY(j), n.getZ(j), uv.getX(j), uv.getY(j)], i * 8);
      }
      const bitmap = material.map ? await createImageBitmap(material.map.image) : null;
      parts.push({ vertices, bitmap, color: material.color.toArray(), roughness: material.roughness ?? .6, metal: material.metalness ?? 0 });
      transfers.push(vertices.buffer); if (bitmap) transfers.push(bitmap);
    }
    geometry.dispose();
  }
  return { parts, transfers, metadata: frame.userData.knifeLibrary };
}
