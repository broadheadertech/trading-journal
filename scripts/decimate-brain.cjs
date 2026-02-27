// Decimate brain.obj using vertex clustering
// Produces a low-poly brain mesh with real face connectivity
const fs = require('fs');
const path = require('path');

const objPath = path.join(__dirname, '..', 'public', 'models', 'brain.obj');
const outPath = path.join(__dirname, '..', 'lib', 'brain-mesh.ts');

const obj = fs.readFileSync(objPath, 'utf-8');
const lines = obj.split('\n');

// Parse vertices and faces
const vertices = [];
const faces = [];

for (const line of lines) {
  if (line.startsWith('v ')) {
    const parts = line.trim().split(/\s+/);
    vertices.push([+parts[1], +parts[2], +parts[3]]);
  } else if (line.startsWith('f ')) {
    const parts = line.trim().split(/\s+/).slice(1);
    const indices = parts.map(p => parseInt(p.split('/')[0]) - 1);
    if (indices.length === 3) {
      faces.push(indices);
    } else if (indices.length === 4) {
      faces.push([indices[0], indices[1], indices[2]]);
      faces.push([indices[0], indices[2], indices[3]]);
    }
  }
}

console.log(`Original: ${vertices.length} vertices, ${faces.length} faces`);

// --- Vertex clustering decimation ---
const GRID = 14; // 14^3 = 2744 max cells → ~500-800 actual

let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (const [x, y, z] of vertices) {
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
  if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
}

const rX = maxX - minX || 1;
const rY = maxY - minY || 1;
const rZ = maxZ - minZ || 1;

// Map each original vertex to a grid cell
const cellMap = new Map();
const vertexMap = new Array(vertices.length);

for (let i = 0; i < vertices.length; i++) {
  const [x, y, z] = vertices[i];
  const gx = Math.min(Math.floor((x - minX) / rX * GRID), GRID - 1);
  const gy = Math.min(Math.floor((y - minY) / rY * GRID), GRID - 1);
  const gz = Math.min(Math.floor((z - minZ) / rZ * GRID), GRID - 1);
  const key = `${gx}_${gy}_${gz}`;

  if (!cellMap.has(key)) {
    cellMap.set(key, { sx: 0, sy: 0, sz: 0, n: 0, idx: cellMap.size });
  }
  const cell = cellMap.get(key);
  cell.sx += x; cell.sy += y; cell.sz += z; cell.n++;
  vertexMap[i] = cell.idx;
}

// Create decimated vertices (centroid of each cluster)
const newVerts = [];
for (const cell of cellMap.values()) {
  newVerts.push([cell.sx / cell.n, cell.sy / cell.n, cell.sz / cell.n]);
}

// Remap faces, skip degenerate
const faceSet = new Set();
const newFaces = [];
for (const [a, b, c] of faces) {
  const na = vertexMap[a], nb = vertexMap[b], nc = vertexMap[c];
  if (na === nb || nb === nc || na === nc) continue;
  const sorted = [na, nb, nc].sort((x, y) => x - y);
  const key = `${sorted[0]}_${sorted[1]}_${sorted[2]}`;
  if (faceSet.has(key)) continue;
  faceSet.add(key);
  newFaces.push([na, nb, nc]);
}

console.log(`Decimated: ${newVerts.length} vertices, ${newFaces.length} faces`);

// Extract unique edges from faces
const edgeSet = new Set();
const edges = [];
for (const [a, b, c] of newFaces) {
  const pairs = [[a, b], [b, c], [a, c]];
  for (const [p, q] of pairs) {
    const key = p < q ? `${p}_${q}` : `${q}_${p}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);
    edges.push([p, q]);
  }
}
console.log(`Edges: ${edges.length}`);

// Normalize: center + scale to ~3.2 unit diameter
const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
const cz = (minZ + maxZ) / 2;
const maxDim = Math.max(rX, rY, rZ);
const scale = 3.2 / maxDim;

// Write TypeScript module
let out = '// Auto-generated decimated brain mesh (vertex-clustered from BrainUVs.obj)\n';
out += `// ${newVerts.length} vertices, ${edges.length} edges\n\n`;

out += 'export const BRAIN_VERTS: number[] = [\n';
for (const [x, y, z] of newVerts) {
  const nx = ((x - cx) * scale).toFixed(3);
  const ny = ((y - cy) * scale).toFixed(3);
  const nz = ((z - cz) * scale).toFixed(3);
  out += `  ${nx},${ny},${nz},\n`;
}
out += '];\n\n';

out += 'export const BRAIN_EDGES: number[] = [\n';
for (const [a, b] of edges) {
  out += `  ${a},${b},\n`;
}
out += '];\n';

fs.writeFileSync(outPath, out);
console.log(`Written to ${outPath} (${(out.length / 1024).toFixed(1)}KB)`);
