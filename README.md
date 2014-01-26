ThreeRTT.js
==========

![ThreeRTT.js](https://raw.github.com/unconed/ThreeRTT.js/master/misc/ThreeRTT.png)

ThreeRTT helps you create advanced render-to-texture effects in Three.js with GLSL. It lets you render effects with framebuffer feedback, access past rendered frames, downsample rendered images with anti-aliasing, do per-pixel raytracing, and more.

It can be used directly with Three.js or as a tQuery plug-in.

* * *

ThreeRTT provides smart render targets backed by multiple buffers, providing transparent read/write/history access. It also includes specialized ShadersMaterials for writing common GLSL pixel effects.

When used with tQuery, a 'render to texture' world object is provided which hooks into the rendering pipeline and can be sized automatically to the viewport.

Depends on: underscore.js (Jeremy Ashkenas), microevent.js (Jerome Etienne)

Builds:

 * ThreeRTT: dependencies + core
 * ThreeRTT-tquery: dependencies + core + tQuery plug-in
 * ThreeRTT-core: core
 * ThreeRTT-core-tquery: core + tQuery plug-in

The built-in shaders are located in `build/ThreeRTT.glsl.html` and must be included in your HTML for ThreeRTT to work.

Basic Usage
===

When passing in textures to a ThreeRTT shader, you can use the following shorthands to create uniforms for you:

* Single texture or render target: access the texture as `texture`
* Array of textures or render targets: access the textures as `texture1`, `texture2`, ...
* Hash of textures or render targets: access the textures under the given keys.

Image feedback effect (stand-alone)
---

Create an isolated render-to-texture `Stage`, i.e. a scene + camera + rendertargets, passing in your Three.js renderer and options like size:

```javascript
var rtt = new ThreeRTT.Stage(renderer, {
  width: 512,
  height: 512,
  history: 0, // number of frames of history to keep
});
```

Create a per-pixel shader material to render into the render target using `FragmentMaterial`. Specify a literal piece of fragment shader code, or the ID of a script tag containing the source code. Optionally add custom textures and uniforms. You can access the `texture` sampler2D uniform to read from the previously rendered frame:

```javascript
var material = new ThreeRTT.FragmentMaterial(rtt, fragmentShader);
// OR
var material = new ThreeRTT.FragmentMaterial(rtt, fragmentShader, textures, uniforms);
```

Use the .fragment() method to render the shader as a full screen quad into the stage:

```javascript
rtt.fragment(material);
```

Pass an object into .paint() to draw it onto the feedback surface as a new pass.
```javascript
// Render a sphere
var sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1),
  new THREE.MeshBasicMaterial()
);
rtt.paint(sphere);
```

Call `rtt.paint(sphere, true)` to paint into the buffer directly, without copying over the last frame first. Only do this if you repaint every pixel every framee.

Compose the rendered texture into the world scene using the `Compose` helper:

```javascript
var compose = new ThreeRTT.Compose(rtt);
scene.add(compose);
```

Before rendering your Three.js scene, call .render() on the render-to-texture stage first.
```javascript
rtt.render();
renderer.render(scene, camera);
```

Alternatively, you may call `rtt.read()` to retrieve a virtual render target for use as a texture. Call `.read(-1)`, `.read(-2)` to access history frames.

Image feedback effect (tQuery)
---

Create an isolated render-to-texture world by calling `.rtt()`, which will be autosized to the framebuffer. Specify a fragment shader to render using `.fragment()`. Specify a literal piece of fragment shader code, or the ID of a script tag containing the source code. Optionally add custom textures and uniforms. You can access the `texture` sampler2D uniform to read from the previously rendered frame:

```javascript
var rtt = world.rtt().fragment(fragmentShader);
// OR
var rtt = world.rtt().fragment(fragmentShader, textures, uniforms);
```

Add something into the RTT scene to draw onto the feedback surface:
```javascript
var sphere = tQuery.createSphere().addTo(rtt);
```

Compose the rendered texture into the scene by calling `.compose()` on the world.
```javascript
world.compose(rtt);
```

High-quality downsample + Bloom postprocessing (tQuery)
-------

Create a render-to-texture world to hold the rendered image to process and add something to the scene.

```javascript
var rtt = world.rtt();
var sphere = tQuery.createSphere().addTo(rtt);
```

Set up a processing chain to downsample the image in repeated steps, a factor of x2 every time. `downsample()` automatically sizes the RTT buffers for you.

```javascript
// Downscale result x 8 in 3 steps
var scale1 = world.rtt().downsample(rtt);
var scale2 = world.rtt().downsample(scale1);
var scale3 = world.rtt().downsample(scale2);
```

Apply a separable blur filter in the X and Y directions on the downsampled image. Use .scale() to set an appropriate derived size for the two buffers:

```javascript
var blurX = world.rtt().scale(8).fragment('rtt-fragment-blurX', scale3);
var blurY = world.rtt().scale(8).fragment('rtt-fragment-blurY', blurX);
```

Compose the blurred image with the original into the final frame.
```javascript
world.compose([ rtt, blurY ], 'combine-fragment');
```

Access past frames (tQuery)
---------------------------

Create a RTT buffer and specify how many frames of history you need.

```javascript
var rtt = world.rtt({ history: 1 });
```

There are two ways to access the frame history. You can call `.read(i)` with i the offset to access individual frames. You can pass them in as textures to your fragment shaders as needed. These frames are virtual and always point to the right read buffer.

```javascript
rtt.fragment(fragmentShader, [ rtt.read(0), rtt.read(-1) ]);
```

Alternatively, you can call .uniform() to get a GLSL uniform that exposes the entire history as an array. This is only recommended if you are reading from the entire history every frame.

```javascript
rtt.fragment('rtt-fragment-water', {}, { texture: rtt.uniform() });
```



Shaders
-------

The built-in shaders are located in `build/ThreeRTT.glsl.html` and must be included in your HTML for ThreeRTT to work.

Examples can be found in `shaders/examples.glsl.html`:

`rtt-fragment-fadeout` Fade out to black
`rtt-fragment-blurX`   7-tap Gaussian blur X
`rtt-fragment-blurY` 7-tap Gaussian blur Y
`rtt-fragment-water` Classic 2D demoscene water effect
'combine-fragment` Combine two textures by averaging

* * *

Steven Wittens - http://acko.net/
