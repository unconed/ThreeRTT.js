ThreeRTT.js
==========

![ThreeRTT.js](https://raw.github.com/unconed/ThreeAudio.js/master/misc/ThreeRTT.png)

ThreeRTT helps you create advanced render-to-texture effects in Three.js. It lets you render effects with framebuffer feedback, access past rendered frames, downsample rendered images with anti-aliasing, do per-pixel raytracing, and more.

It can be used directly with Three.js or as a tQuery plug-in.

* * *

ThreeRTT provides smart render targets backed by multiple buffers, providing transparent read/write/history access. It also includes specialized ShadersMaterials for writing common GLSL pixel effects.

When used with tQuery, a 'render to texture' world object is provided which hooks into the rendering pipeline and can be sized automatically to the viewport.

Includes: microevent.js (Jerome Etienne)

Builds:

 * ThreeRTT: microevent + core
 * ThreeRTT-tquery: microevent + core + tQuery plug-in

Basic Usage
===

Image feedback effect (stand-alone)
---

Create an isolated render-to-texture `Stage`, i.e. a scene + camera + rendertargets, passing in your Three.js renderer and options like size:

```
var rtt = new ThreeRTT.Stage(renderer, {
  width: 512,
  height: 512
});
```

Create a per-pixel shader material to render into the render target using `FragmentMaterial`. Specify a literal piece of fragment shader code, or the ID of a script tag containing the source code. Optionally add custom textures and uniforms. You can access the `texture` sampler2D uniform to read from the previously rendered frame:

```
var material = new ThreeRTT.FragmentMaterial(rtt, fragmentShader);
// OR
var material = new ThreeRTT.FragmentMaterial(rtt, fragmentShader, textures, uniforms);
```

Use the .material() method to render the shader as a full screen quad into the stage:

```
rtt.material(material);
```

Add something into the RTT scene to draw onto the feedback surface.
```
// Render a sphere
var sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1),
  new THREE.MeshBasicMaterial()
);
rtt.scene.add(sphere);
```

Compose the rendered texture into the scene using the `Compose` helper:

```
var compose = new ThreeRTT.Compose(scene, rtt);
```

Before rendering your Three.js scene, call .render() on the render-to-texture stage first.
```
rtt.render();
renderer.render(scene, camera);
```

Image feedback effect (tQuery)
---

Create an isolated render-to-texture world by calling `.rtt()` and specify a fragment shader to render using `.fragment()`. Specify a literal piece of fragment shader code, or the ID of a script tag containing the source code. Optionally add custom textures and uniforms. You can access the `texture` sampler2D uniform to read from the previously rendered frame:

```
var rtt = world.rtt().fragment(fragmentShader);
// OR
var rtt = world.rtt().fragment(fragmentShader, textures, uniforms);
```

Add something into the RTT scene to draw onto the feedback surface:
```
var sphere = tQuery.createSphere().addTo(rtt);
```

Compose the rendered texture into the scene by calling `.compose()` on the world.
```
world.compose(rtt);
```

Shaders
-------


* * *

Steven Wittens - http://acko.net/
