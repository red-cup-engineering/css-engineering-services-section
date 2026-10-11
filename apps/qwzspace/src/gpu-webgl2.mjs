// gpu-webgl2 — the 3D tier's WebGL2 device: it uploads the scene graph's meshes and runs its draw
// list. It knows nothing of entities or worlds; a frame is matrices, light, and items
// ({ mesh, model, colour, opacity, lit, vertexColours, depthWrite, roughness, mode }).
//
// Shading is the engine's own: Lambert under a sun, a moon and a sky/ground hemisphere, a
// Blinn–Phong highlight whose sharpness follows roughness, linear-depth fog, all in linear light
// and written out as sRGB. Faces are drawn from both sides, the normal turned toward the eye, so a
// place's shell reads from within as from without. Depth is logarithmic (written per fragment from
// the eye distance): a world drawn from 0.3 m to 30 km keeps sub-millimetre depth a kilometre off,
// so a floor laid a few centimetres over the ground does not fight it.

const VERTEX = `#version 300 es
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec3 colour;
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vColour;
out float vDepth;
out float vLogDepth;
void main() {
  vec4 world = model * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(model) * normal;
  vColour = colour;
  vec4 eyeSpace = view * world;
  vDepth = -eyeSpace.z;
  gl_Position = projection * eyeSpace;
  vLogDepth = 1.0 + gl_Position.w;
  // The engine's clip depth is [0, 1] (WebGPU's); WebGL's is [-1, 1].
  gl_Position.z = gl_Position.z * 2.0 - gl_Position.w;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vColour;
in float vDepth;
in float vLogDepth;
uniform float logDepth;
uniform vec3 base;
uniform float opacity;
uniform bool lit;
uniform bool useVertexColour;
uniform float roughness;
uniform vec3 eye;
uniform vec3 sunDirection;
uniform vec3 sunLight;
uniform vec3 moonDirection;
uniform vec3 moonLight;
uniform vec3 hemisphereSky;
uniform vec3 hemisphereGround;
uniform vec3 fogColour;
uniform vec2 fogRange;
out vec4 outColour;
const float PI = 3.14159265;
vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 direct(vec3 n, vec3 v, vec3 l, vec3 light, vec3 albedo, float shininess) {
  float nl = max(dot(n, l), 0.0);
  vec3 h = normalize(l + v);
  float specular = 0.04 * (shininess + 8.0) / (8.0 * PI) * pow(max(dot(n, h), 0.0), shininess);
  return light * nl * (albedo / PI + specular);
}
void main() {
  vec3 albedo = useVertexColour ? vColour * base : base;
  vec3 colour = albedo;
  if (lit) {
    vec3 v = normalize(eye - vWorld);
    vec3 n = normalize(vNormal);
    if (dot(n, v) < 0.0) n = -n;
    float r = max(roughness, 0.05);
    float shininess = clamp(2.0 / (r * r * r * r) - 2.0, 1.0, 4096.0);
    colour = direct(n, v, sunDirection, sunLight, albedo, shininess)
      + direct(n, v, moonDirection, moonLight, albedo, shininess)
      + mix(hemisphereGround, hemisphereSky, 0.5 * n.z + 0.5) * albedo / PI;
  }
  colour = mix(colour, fogColour, smoothstep(fogRange.x, fogRange.y, vDepth));
  outColour = vec4(encode(colour), opacity);
  gl_FragDepth = log2(vLogDepth) * logDepth;
}`;

const UNIFORMS = ["logDepth", "model", "view", "projection", "base", "opacity", "lit", "useVertexColour", "roughness", "eye",
  "sunDirection", "sunLight", "moonDirection", "moonLight", "hemisphereSky", "hemisphereGround", "fogColour", "fogRange"];

const scaled = (colour, intensity) => colour.map((c) => c * intensity);

function compile(gl) {
  const shader = (type, source) => {
    const made = gl.createShader(type);
    gl.shaderSource(made, source);
    gl.compileShader(made);
    if (!gl.getShaderParameter(made, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(`gpu-webgl2: ${gl.getShaderInfoLog(made)}`);
    return made;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(`gpu-webgl2: ${gl.getProgramInfoLog(program)}`);
  return { program, at: Object.fromEntries(UNIFORMS.map((name) => [name, gl.getUniformLocation(program, name)])) };
}

/** A WebGL2 device over `canvas`, or null where the browser has no WebGL2. */
export function createWebGL2Device(canvas, { antialias = true } = {}) {
  const gl = canvas?.getContext?.("webgl2", { antialias, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  let shading = compile(gl);
  let uploads = new WeakMap(); // mesh -> { vao, count, buffers }

  canvas.addEventListener?.("webglcontextlost", (event) => event.preventDefault());
  canvas.addEventListener?.("webglcontextrestored", () => {
    shading = compile(gl);
    uploads = new WeakMap();
  });

  function upload(mesh) {
    let made = uploads.get(mesh);
    if (made) return made;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buffers = [];
    const attribute = (location, data) => {
      if (!data) {
        gl.disableVertexAttribArray(location);
        return;
      }
      const buffer = gl.createBuffer();
      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    };
    attribute(0, mesh.positions);
    attribute(1, mesh.normals);
    attribute(2, mesh.colours);
    const index = gl.createBuffer();
    buffers.push(index);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices instanceof Uint32Array ? mesh.indices : Uint32Array.from(mesh.indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    made = { vao, count: mesh.indices.length, buffers };
    uploads.set(mesh, made);
    return made;
  }

  return {
    kind: "webgl2",
    gl,
    /** Draw one frame: { width, height (device pixels), view, projection, far, eye, light, items }. */
    draw({ width, height, view, projection, far, eye, light, items }) {
      if (gl.isContextLost()) return;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      const [r, g, b] = light.sky.map((c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
      gl.clearColor(r, g, b, 1);
      gl.depthMask(true);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const { program, at } = shading;
      gl.useProgram(program);
      gl.uniformMatrix4fv(at.view, false, view);
      gl.uniformMatrix4fv(at.projection, false, projection);
      gl.uniform1f(at.logDepth, 1 / Math.log2(far + 1));
      gl.uniform3fv(at.eye, eye);
      gl.uniform3fv(at.sunDirection, light.sun.direction);
      gl.uniform3fv(at.sunLight, scaled(light.sun.colour, light.sun.intensity));
      gl.uniform3fv(at.moonDirection, light.moon.direction);
      gl.uniform3fv(at.moonLight, scaled(light.moon.colour, light.moon.intensity));
      gl.uniform3fv(at.hemisphereSky, scaled(light.hemisphere.sky, light.hemisphere.intensity));
      gl.uniform3fv(at.hemisphereGround, scaled(light.hemisphere.ground, light.hemisphere.intensity));
      gl.uniform3fv(at.fogColour, light.fog.colour);
      gl.uniform2f(at.fogRange, light.fog.near, light.fog.far);

      for (const item of items) {
        const made = upload(item.mesh);
        gl.bindVertexArray(made.vao);
        if (!item.mesh.colours) gl.vertexAttrib3f(2, 1, 1, 1);
        if (!item.mesh.normals) gl.vertexAttrib3f(1, 0, 0, 1);
        gl.uniformMatrix4fv(at.model, false, item.model);
        gl.uniform3fv(at.base, item.colour);
        gl.uniform1f(at.opacity, item.opacity);
        gl.uniform1i(at.lit, item.lit ? 1 : 0);
        gl.uniform1i(at.useVertexColour, item.vertexColours ? 1 : 0);
        gl.uniform1f(at.roughness, item.roughness);
        if (item.opacity < 1) gl.enable(gl.BLEND);
        else gl.disable(gl.BLEND);
        gl.depthMask(item.depthWrite);
        gl.drawElements(item.mode === "lines" ? gl.LINES : gl.TRIANGLES, made.count, gl.UNSIGNED_INT, 0);
      }
      gl.bindVertexArray(null);
    },
  };
}
