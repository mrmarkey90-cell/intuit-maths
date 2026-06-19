// Fetches a hand-drawn avatar asset (hair/clothing/hat/face SVG exported
// from Inkscape), strips it down to plain renderable shape data, and
// flags which shape (if any) is the colour-swappable one -- the one the
// artist tagged with id="fill" (see CLAUDE.md's avatar asset convention).
//
// Inkscape exports are full documents (sodipodi/inkscape metadata, defs,
// path-effect references, comments) -- browsers ignore all of that
// automatically when rendering raw markup, but we don't render raw
// markup. We re-render each shape as a plain React element instead, so
// that many avatars can appear on one page without colliding on
// duplicate ids (every Inkscape export reuses ids like "fill", "path1").
// That means the original id is intentionally dropped once read here.

const SHAPE_TAGS = new Set(['path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline', 'line'])

function camelCase(prop) {
  return prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
}

function parseStyle(styleAttr) {
  const out = {}
  for (const decl of styleAttr.split(';')) {
    const [prop, value] = decl.split(':').map(s => s?.trim())
    if (prop && value) out[camelCase(prop)] = value
  }
  return out
}

function extractShapes(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const shapes = []

  function walk(node, insideDefs) {
    for (const child of node.children) {
      const tag = child.tagName.toLowerCase()
      if (tag === 'defs') { walk(child, true); continue }
      if (!insideDefs && SHAPE_TAGS.has(tag)) {
        const attrs = {}
        for (const attr of child.attributes) {
          if (attr.name === 'id' || attr.name.startsWith('inkscape:') || attr.name.startsWith('sodipodi:')) continue
          if (attr.name === 'style') Object.assign(attrs, parseStyle(attr.value))
          else attrs[attr.name] = attr.value
        }
        shapes.push({ tag, attrs, isFillTarget: child.getAttribute('id') === 'fill' })
      }
      walk(child, insideDefs)
    }
  }

  walk(doc.documentElement, false)
  return shapes
}

const cache = new Map()

// Returns a Promise<Array<{ tag, attrs, isFillTarget }> | null> -- null
// for index === null/undefined (nothing equipped, e.g. no hat) or if the
// file doesn't exist (asset not drawn yet).
export function loadAvatarAsset(category, index) {
  if (index === null || index === undefined) return Promise.resolve(null)
  const key = `${category}/${index}`
  if (!cache.has(key)) {
    const padded = String(index).padStart(2, '0')
    cache.set(key, fetch(`/avatars/${category}/${padded}.svg`)
      .then(res => { if (!res.ok) throw new Error('not found'); return res.text() })
      .then(extractShapes)
      .catch(() => null))
  }
  return cache.get(key)
}
