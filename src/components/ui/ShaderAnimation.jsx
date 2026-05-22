import { useEffect, useRef } from 'react'

export function ShaderAnimation({ style = {} }) {
  const containerRef = useRef(null)
  const sceneRef = useRef({
    camera: null, scene: null, renderer: null,
    uniforms: null, animationId: null, resizeHandler: null,
  })

  useEffect(() => {
    if (window.THREE) {
      if (containerRef.current) initThreeJS()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js'
    script.onload = () => { if (containerRef.current && window.THREE) initThreeJS() }
    document.head.appendChild(script)
    return () => {
      cleanup()
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [])

  function cleanup() {
    if (sceneRef.current.animationId) cancelAnimationFrame(sceneRef.current.animationId)
    if (sceneRef.current.resizeHandler) window.removeEventListener('resize', sceneRef.current.resizeHandler)
    if (sceneRef.current.renderer) sceneRef.current.renderer.dispose()
    sceneRef.current.animationId = null
  }

  function initThreeJS() {
    if (!containerRef.current || !window.THREE) return
    cleanup()
    const THREE = window.THREE
    const container = containerRef.current
    container.innerHTML = ''

    const camera = new THREE.Camera()
    camera.position.z = 1
    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneBufferGeometry(2, 2)

    const uniforms = {
      time: { type: 'f', value: 1.0 },
      resolution: { type: 'v2', value: new THREE.Vector2() },
    }

    const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`

    // Clean vertical shader lines — no mosaic pixelation, smooth radial glow
    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      float hash(float n) { return fract(sin(n) * 43758.5453); }

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

        // Gentle per-column phase variation creates vertical stripe character
        float col = uv.x * 18.0;
        float colId = floor(col);
        float colFrac = fract(col);

        float t = time * 0.04;
        vec3 color = vec3(0.0);

        for (int i = 0; i < 6; i++) {
          float fi = float(i);
          // Each line has its own speed, width, and position offset
          float speed   = 0.4 + hash(fi * 1.37) * 0.6;
          float offset  = hash(fi * 2.71 + 1.0) * 20.0;
          float width   = 0.0006 + hash(fi * 0.91) * 0.0006;

          // Animate along x with smooth sinusoidal drift
          float xDrift  = sin(t * speed + fi * 1.618 + offset) * 0.25;
          float lineX   = fract(fi * 0.1618 + t * speed * 0.15) * 2.0 - 1.0 + xDrift;

          float dist = abs(uv.x - lineX);
          float brightness = width / (dist + 0.0001);

          // RGB channels slightly offset for chromatic glow
          color.r += brightness * (0.6 + 0.4 * sin(t + fi * 2.1));
          color.g += brightness * (0.5 + 0.5 * sin(t + fi * 1.4 + 1.0));
          color.b += brightness * (0.8 + 0.2 * sin(t + fi * 0.9 + 2.0));
        }

        // Soft vignette so edges aren't blown out
        float vignette = 1.0 - smoothstep(0.5, 1.4, length(uv));
        color *= vignette;

        // Tone-map — prevents total blowout on bright lines
        color = color / (color + vec3(1.0));
        color = pow(color, vec3(0.85));

        gl_FragColor = vec4(color, 1.0);
      }
    `

    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' })
    // Cap pixel ratio at 1 on mobile — saves GPU with negligible visual loss
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1 : 1.5))
    container.appendChild(renderer.domElement)

    const onWindowResize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      uniforms.resolution.value.x = renderer.domElement.width
      uniforms.resolution.value.y = renderer.domElement.height
    }
    onWindowResize()
    window.addEventListener('resize', onWindowResize, false)

    sceneRef.current = { camera, scene, renderer, uniforms, resizeHandler: onWindowResize, animationId: null }

    // ~30 fps cap — smooth at this rate, saves ~50% GPU vs 60fps
    let lastTime = 0
    const FPS_CAP = 1000 / 30
    const animate = (now) => {
      sceneRef.current.animationId = requestAnimationFrame(animate)
      if (now - lastTime < FPS_CAP) return
      lastTime = now
      uniforms.time.value += 0.05
      renderer.render(scene, camera)
    }
    animate(0)
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%', ...style }} />
}
