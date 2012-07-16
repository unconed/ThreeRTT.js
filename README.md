ThreeRTT.js
==========

![ThreeRTT.js](https://raw.github.com/unconed/ThreeAudio.js/master/misc/ThreeRTT.png)

ThreeRTT helps you create advanced render-to-texture effects in Three.js. It lets you render effects with framebuffer feedback, access past rendered frames, downsample rendered images with anti-aliasing, do per-pixel raytracing, and more.

It can be used directly with Three.js or as a tQuery plug-in.

* * *

ThreeRTT provides virtual render targets backed by multiple buffers, providing transparent read/write/history access. It also includes specialized ShadersMaterials for writing common GLSL pixel effects.

When used with tQuery, a 'render to texture' world object is provided which hooks into the rendering pipeline. Render-to-texture passes can be ordered manually to ensure correct rendering of complex effects.

Includes: microevent.js (Jerome Etienne)

Builds:

 * ThreeRTT: microevent + core
 * ThreeRTT-tquery: microevent + core + tQuery plug-in

Basic Usage
-----

1) Image feedback effect (stand-alone)

Create an isolated render-to-texture stage, i.e. a scene + camera + rendertargets, passing in your Three.js renderer:

```
var rtt = new ThreeRTT.Stage(renderer, {
  width: 512,
  height: 512
});
```

Create a shader material to render into the render target using FragmentMaterial. Specify a literal piece of fragment shader code, or the ID of a script tag containing the source code. Optionally add custom textures and uniforms. You can access the `texture` sampler2D uniform to read from the previously rendered frame:

```
var rttMaterial = new ThreeRTT.FragmentMaterial(rtt, fragmentShader);
// OR
var rttMaterial = new ThreeRTT.FragmentMaterial(rtt, fragmentShader, textures, uniforms);
```

Use the .material() helper to render the shader as a full screen quad into the stage:

```
rtt.material(rttMaterial);
```

Access the generated texture using rtt.read(), which returns a THREE.RenderTarget object. This can be used like a THREE.Texture object in materials, applied to objects in your regular Three.js scene. For convenience, you can render the generated texture directly to the screen using `ScreenGeometry` and `FragmentMaterial`:

```
// Render as full screen quad using default shader
var quad = new THREE.Mesh(
  new THREE.ScreenGeometry(),
  new THREE.FragmentMaterial(rtt)
);
scene.add(quad);

// Render onto a sphere
var sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1),
  new THREE.MeshBasicMaterial({ map: rtt.read() })
);
scene.add(sphere);
```

Before rendering your Three.js scene, call .render() on the render-to-texture stage first.
```
rtt.render();
renderer.render(scene, camera);
```

2) Image feedback effect (tQuery)

Create an isolated render-to-texture world.

```
var rtt = world.rtt({
  width: 512,
  height: 512
});
```

Set the material to render into the render target using .fragment() to create and bind a FragmentMaterial. Specify a literal piece of fragment shader code, or the ID of a script tag containing the source code. Optionally add custom textures and uniforms. You can access the `texture` sampler2D uniform to read from the previously rendered frame:

```
rtt.fragment(fragmentShader);
// OR
rtt.fragment(fragmentShader, textures, uniforms);
```


Shaders
-------

See `shaders/shaders.glsl.html` for an example shader that generates a 3d spectrum voiceprint.

* * *

Steven Wittens - http://acko.net/
