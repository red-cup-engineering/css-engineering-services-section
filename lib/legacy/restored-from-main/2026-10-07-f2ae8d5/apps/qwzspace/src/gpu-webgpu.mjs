// gpu-webgpu — the 3D tier's WebGPU device: the same device interface as gpu-webgl2, drawing the
// same frame ({ width, height, view, projection, far, eye, light, items }) with WGSL shaders. It
// adds nothing: the scene graph, the camera and the meshes are render-3d's and scene-graph's, and
// only the device and pipeline layer differ. The shading is gpu-webgl2's line for line (Lambert
// under a sun, a moon and a sky/ground hemisphere, a Blinn-Phong highlight following roughness,
// linear-depth fog, linear light written out as sRGB, faces drawn from both sides, depth written
// per fragment from the eye distance), so a frame reads the same on either device.
//
// The engine's clip depth is already [0, 1], WebGPU's own, so the projection is used as it comes.
//
// Everything that can fail (adapter, device, shader compilation, the first pipeline) is done before
// the canvas is asked for its "webgpu" context, so a refusal leaves the canvas free for a WebGL2
// device or a 2D plan. `createWebGPUDevice` resolves to null where there is no adapter and rejects
// where the device or its shaders are unusable; the caller falls down the ladder on either.

export const WGSL = `
struct Frame {
  view: mat4x4f,
  projection: mat4x4f,
  eye: vec4f,            // xyz eye, w 1 / log2(far + 1)
  sunDirection: vec4f,
  sunLight: vec4f,
  moonDirection: vec4f,
  moonLight: vec4f,
  hemisphereSky: vec4f,
  hemisphereGround: vec4f,
  fogColour: vec4f,
  fogRange: vec4f,       // xy near, far
}
struct Item {
  model: mat4x4f,
  base: vec4f,           // rgb base colour, a opacity
  params: vec4f,         // x lit, y vertex colours, z roughness
}
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<uniform> item: Item;

struct VertexIn {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) colour: vec3f,
}
struct VertexOut {
  @builtin(position) clip: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) colour: vec3f,
  @location(3) depth: f32,
  @location(4) logDepth: f32,
}

@vertex
fn vertexMain(in: VertexIn) -> VertexOut {
  var out: VertexOut;
  let world = item.model * vec4f(in.position, 1.0);
  let eyeSpace = frame.view * world;
  out.world = world.xyz;
  out.normal = (item.model * vec4f(in.normal, 0.0)).xyz;
  out.colour = in.colour;
  out.depth = -eyeSpace.z;
  out.clip = frame.projection * eyeSpace;
  out.logDepth = 1.0 + out.clip.w;
  return out;
}

const PI = 3.14159265;

fn encode(colour: vec3f) -> vec3f {
  let c = clamp(colour, vec3f(0.0), vec3f(1.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3f(1.0 / 2.4)) - 0.055, step(vec3f(0.0031308), c));
}

fn direct(n: vec3f, v: vec3f, l: vec3f, light: vec3f, albedo: vec3f, shininess: f32) -> vec3f {
  let nl = max(dot(n, l), 0.0);
  let h = normalize(l + v);
  let specular = 0.04 * (shininess + 8.0) / (8.0 * PI) * pow(max(dot(n, h), 0.0), shininess);
  return light * nl * (albedo / PI + specular);
}

struct FragmentOut {
  @location(0) colour: vec4f,
  @builtin(frag_depth) depth: f32,
}

@fragment
fn fragmentMain(in: VertexOut) -> FragmentOut {
  var albedo = item.base.rgb;
  if (item.params.y > 0.5) { albedo = in.colour * item.base.rgb; }
  var colour = albedo;
  if (item.params.x > 0.5) {
    let v = normalize(frame.eye.xyz - in.world);
    var n = normalize(in.normal);
    if (dot(n, v) < 0.0) { n = -n; }
    let r = max(item.params.z, 0.05);
    let shininess = clamp(2.0 / (r * r * r * r) - 2.0, 1.0, 4096.0);
    colour = direct(n, v, frame.sunDirection.xyz, frame.sunLight.xyz, albedo, shininess)
      + direct(n, v, frame.moonDirection.xyz, frame.moonLight.xyz, albedo, shininess)
      + mix(frame.hemisphereGround.xyz, frame.hemisphereSky.xyz, 0.5 * n.z + 0.5) * albedo / PI;
  }
  colour = mix(colour, frame.fogColour.xyz, smoothstep(frame.fogRange.x, frame.fogRange.y, in.depth));
  var out: FragmentOut;
  out.colour = vec4f(encode(colour), item.base.a);
  out.depth = log2(in.logDepth) * frame.eye.w;
  return out;
}
`;

const FRAME_FLOATS = 68;   // 2 matrices + 9 vec4
const ITEM_FLOATS = 24;    // 1 matrix + 2 vec4
const DEPTH_FORMAT = "depth32float";
const SAMPLES = 4;

const scaled = (colour, intensity) => colour.map((c) => c * intensity);
const sRGB = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

/** A WebGPU device over `canvas`: null where the browser has no WebGPU or no adapter; rejects where
 *  the device, its shader or its pipeline is unusable. `gpu` is navigator.gpu unless one is given. */
export async function createWebGPUDevice(canvas, { antialias = true, gpu = globalThis.navigator?.gpu } = {}) {
  if (!gpu || typeof canvas?.getContext !== "function") return null;
  const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const format = gpu.getPreferredCanvasFormat();
  const samples = antialias ? SAMPLES : 1;
  const stride = Math.max(256, device.limits?.minUniformBufferOffsetAlignment ?? 256);

  device.pushErrorScope("validation");
  const module = device.createShaderModule({ label: "qwzspace-3d", code: WGSL });
  const info = await module.getCompilationInfo();
  const failures = info.messages.filter((message) => message.type === "error");
  if (failures.length > 0) {
    await device.popErrorScope();
    device.destroy?.();
    throw new Error(`gpu-webgpu: ${failures.map((m) => `${m.lineNum}:${m.linePos} ${m.message}`).join("; ")}`);
  }
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: "uniform", hasDynamicOffset: true, minBindingSize: ITEM_FLOATS * 4 } },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  const vertex = (location) => ({ shaderLocation: location, offset: 0, format: "float32x3" });
  const pipelines = new Map();
  const pipelineFor = (lines, blend, depthWrite) => {
    const key = `${lines ? "l" : "t"}${blend ? "b" : "o"}${depthWrite ? "w" : "r"}`;
    let made = pipelines.get(key);
    if (!made) {
      made = device.createRenderPipeline({
        label: `qwzspace-3d-${key}`,
        layout: pipelineLayout,
        vertex: {
          module, entryPoint: "vertexMain",
          buffers: [0, 1, 2].map((location) => ({ arrayStride: 12, attributes: [vertex(location)] })),
        },
        fragment: {
          module, entryPoint: "fragmentMain",
          targets: [{
            format,
            blend: blend ? {
              color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
              alpha: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add" },
            } : undefined,
          }],
        },
        primitive: { topology: lines ? "line-list" : "triangle-list", cullMode: "none" },
        depthStencil: { format: DEPTH_FORMAT, depthWriteEnabled: depthWrite, depthCompare: "less-equal" },
        multisample: { count: samples },
      });
      pipelines.set(key, made);
    }
    return made;
  };
  pipelineFor(false, false, true); // the first pipeline now, so a refusal surfaces before the canvas is taken
  const refusal = await device.popErrorScope();
  if (refusal) {
    device.destroy?.();
    throw new Error(`gpu-webgpu: ${refusal.message}`);
  }

  const context = canvas.getContext("webgpu");
  if (!context) {
    device.destroy?.();
    throw new Error("gpu-webgpu: the canvas gave no webgpu context");
  }
  context.configure({ device, format, alphaMode: "opaque" });

  // A validation error while drawing is reported, not thrown: a frame is skipped, the next may draw.
  device.addEventListener?.("uncapturederror", (event) => console.error(`gpu-webgpu: ${event.error?.message}`));
  let lost = false;
  device.lost.then((reason) => {
    lost = true;
    if (reason?.reason !== "destroyed") console.warn("gpu-webgpu: device lost", reason?.message);
  });

  const frameBuffer = device.createBuffer({ label: "qwzspace-frame", size: FRAME_FLOATS * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  let itemBuffer = null, itemCapacity = 0, bindGroup = null;
  let targets = { width: 0, height: 0, depth: null, colour: null };
  const uploads = new WeakMap(); // mesh -> { positions, normals, colours, indices, count }

  const filled = (count, value) => {
    const data = new Float32Array(count * 3);
    for (let k = 0; k < count; k++) data.set(value, k * 3);
    return data;
  };
  const vertexBuffer = (data) => {
    const buffer = device.createBuffer({ size: Math.max(16, (data.byteLength + 3) & ~3), usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(buffer, 0, data);
    return buffer;
  };
  function upload(mesh) {
    let made = uploads.get(mesh);
    if (made) return made;
    const count = mesh.positions.length / 3;
    const indices = mesh.indices instanceof Uint32Array ? mesh.indices : Uint32Array.from(mesh.indices);
    const index = device.createBuffer({ size: Math.max(16, indices.byteLength), usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(index, 0, indices);
    made = {
      positions: vertexBuffer(mesh.positions),
      normals: vertexBuffer(mesh.normals ?? filled(count, [0, 0, 1])),
      colours: vertexBuffer(mesh.colours ?? filled(count, [1, 1, 1])),
      indices: index,
      count: indices.length,
    };
    uploads.set(mesh, made);
    return made;
  }

  function resize(width, height) {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (targets.width === width && targets.height === height) return;
    targets.depth?.destroy();
    targets.colour?.destroy();
    const make = (textureFormat) => device.createTexture({ size: [width, height], format: textureFormat, sampleCount: samples, usage: GPUTextureUsage.RENDER_ATTACHMENT });
    targets = { width, height, depth: make(DEPTH_FORMAT), colour: samples > 1 ? make(format) : null };
  }

  const frameData = new Float32Array(FRAME_FLOATS);
  return {
    kind: "webgpu",
    device,
    format,
    /** Draw one frame: { width, height (device pixels), view, projection, far, eye, light, items }. */
    draw({ width, height, view, projection, far, eye, light, items }) {
      if (lost || width < 1 || height < 1) return;
      resize(width, height);

      frameData.set(view, 0);
      frameData.set(projection, 16);
      frameData.set([...eye, 1 / Math.log2(far + 1)], 32);
      frameData.set([...light.sun.direction, 0], 36);
      frameData.set([...scaled(light.sun.colour, light.sun.intensity), 0], 40);
      frameData.set([...light.moon.direction, 0], 44);
      frameData.set([...scaled(light.moon.colour, light.moon.intensity), 0], 48);
      frameData.set([...scaled(light.hemisphere.sky, light.hemisphere.intensity), 0], 52);
      frameData.set([...scaled(light.hemisphere.ground, light.hemisphere.intensity), 0], 56);
      frameData.set([...light.fog.colour, 0], 60);
      frameData.set([light.fog.near, light.fog.far, 0, 0], 64);
      device.queue.writeBuffer(frameBuffer, 0, frameData);

      const slot = stride / 4;
      if (items.length > itemCapacity) {
        itemBuffer?.destroy();
        itemCapacity = Math.max(64, 2 ** Math.ceil(Math.log2(items.length)));
        itemBuffer = device.createBuffer({ label: "qwzspace-items", size: itemCapacity * stride, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
        bindGroup = device.createBindGroup({
          layout,
          entries: [
            { binding: 0, resource: { buffer: frameBuffer } },
            { binding: 1, resource: { buffer: itemBuffer, size: ITEM_FLOATS * 4 } },
          ],
        });
      }
      const itemData = new Float32Array(Math.max(1, items.length) * slot);
      items.forEach((item, k) => {
        itemData.set(item.model, k * slot);
        itemData.set([...item.colour, item.opacity], k * slot + 16);
        itemData.set([item.lit ? 1 : 0, item.vertexColours ? 1 : 0, item.roughness, 0], k * slot + 20);
      });
      if (items.length > 0) device.queue.writeBuffer(itemBuffer, 0, itemData);

      const [r, g, b] = light.sky.map(sRGB);
      const surface = context.getCurrentTexture().createView();
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: targets.colour ? targets.colour.createView() : surface,
          resolveTarget: targets.colour ? surface : undefined,
          clearValue: { r, g, b, a: 1 },
          loadOp: "clear",
          storeOp: targets.colour ? "discard" : "store",
        }],
        depthStencilAttachment: { view: targets.depth.createView(), depthClearValue: 1, depthLoadOp: "clear", depthStoreOp: "discard" },
      });
      items.forEach((item, k) => {
        const made = upload(item.mesh);
        pass.setPipeline(pipelineFor(item.mode === "lines", item.opacity < 1, item.depthWrite));
        pass.setBindGroup(0, bindGroup, [k * stride]);
        pass.setVertexBuffer(0, made.positions);
        pass.setVertexBuffer(1, made.normals);
        pass.setVertexBuffer(2, made.colours);
        pass.setIndexBuffer(made.indices, "uint32");
        pass.drawIndexed(made.count);
      });
      pass.end();
      device.queue.submit([encoder.finish()]);
    },
  };
}
