import THREE from 'three';

import WMOGroupView from './view';
import BSPTree from '../../../utils/bsp-tree';

class WMOGroup {

  constructor(root, def) {
    this.root = root;

    this.path = def.path;
    this.index = def.index;
    this.id = def.groupID;
    this.header = def.header;

    this.doodadRefs = def.doodadRefs;

    this.createPortals(root, def);
    this.createMaterial(def.materialRefs);
    this.createGeometry(def.attributes, def.batches);
    this.createBoundingBox(def.boundingBox);
    this.createBSPTree(def.bspNodes, def.bspPlaneIndices, def.attributes);
  }

  // Produce a new WMOGroupView suitable for placement in a scene.
  createView() {
    return new WMOGroupView(this, this.geometry, this.material);
  }

  createPortals(root, def) {
    const portals = this.portals = [];
    const portalRefs = this.portalRefs = [];

    if (def.header.portalCount > 0) {
      const pbegin = def.header.portalOffset;
      const pend = pbegin + def.header.portalCount;

      for (let pindex = pbegin; pindex < pend; ++pindex) {
        const ref = root.portalRefs[pindex];
        const portal = root.portals[ref.portalIndex];

        portalRefs.push(ref);
        portals.push(portal);
      }
    }
  }

  // Materials are created on the root blueprint to take advantage of sharing materials across
  // multiple groups (when possible).
  createMaterial(materialRefs) {
    const material = this.material = new THREE.MultiMaterial();
    material.materials = this.root.loadMaterials(materialRefs);
  }

  createGeometry(attributes, batches) {
    const geometry = this.geometry = new THREE.BufferGeometry();

    const { indices, positions, normals, uvs, colors } = attributes;

    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.addAttribute('acolor', new THREE.BufferAttribute(colors, 4));

    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    this.assignBatches(geometry, batches);

    return geometry;
  }

  assignBatches(geometry, batches) {
    const batchCount = batches.length;

    for (let index = 0; index < batchCount; ++index) {
      const batch = batches[index];
      geometry.addGroup(batch.firstIndex, batch.indexCount, index);
    }
  }

  dispose() {
    if (this.geometry) {
      this.geometry.dispose();
    }

    if (this.material) {
      for (const material of this.material.materials) {
        this.root.unloadMaterial(material);
      }
    }
  }

  createBoundingBox(def) {
    const boundingBox = this.boundingBox = new THREE.Box3;

    const min = new THREE.Vector3(def.min[0], def.min[1], def.min[2]);
    const max = new THREE.Vector3(def.max[0], def.max[1], def.max[2]);

    boundingBox.set(min, max);
  }

  createBSPTree(nodes, planeIndices, attributes) {
    const { indices, positions } = attributes;

    const bspTree = this.bspTree = new BSPTree(nodes, planeIndices, indices, positions);
  }

  /**
   * Identify the closest portal to the given point (in local space). Projects point on portal
   * plane and clamps to portal vertex bounds prior to calculating distance.
   *
   * See: CMapObj::ClosestPortal
   *
   * @param point - Point (in local space) for which distance is calculated
   * @param max - Optional upper limit for distance
   *
   * @returns - Closest portal and corresponding ref
   *
   */
  closestPortal(point, max = null) {
    if (this.portals.length === 0) {
      return null;
    }

    let shortestDistance = max;

    const result = {
      portal: null,
      portalRef: null,
      distance: null
    };

    for (let index = 0, count = this.portals.length; index < count; ++index) {
      const portal = this.portals[index];
      const portalRef = this.portalRefs[index];

      const distance = portal.plane.projectPoint(point).
        clamp(portal.boundingBox.min, portal.boundingBox.max).
        distanceTo(point);

      if (shortestDistance === null || distance < shortestDistance) {
        shortestDistance = distance;

        const sign = portal.plane.distanceToPoint(point) < 0.0 ? -1 : 1;

        result.portal = portal;
        result.portalRef = portalRef;
        result.distance = distance * sign;
      }
    }

    if (result.portal === null) {
      return null;
    } else {
      return result;
    }
  }

}

export default WMOGroup;
