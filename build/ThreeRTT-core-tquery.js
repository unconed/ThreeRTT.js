// Check dependencies.
;(function (deps) {
  for (var i in deps) {
    if (!window[i]) throw "Error: ThreeRTT requires " + deps[i];
  }
})({
  'THREE': 'Three.js'//,
});

// Namespace
window.ThreeRTT = window.ThreeRTT || {};
ThreeRTT.World = function () {};

// Fetch shader from <script> tag by id
// or pass through string if not exists.
ThreeRTT.getShader = function (id) {
  var elem = document.getElementById(id);
  return elem && elem.innerText || id;
};

// Simple loop helper
_.loop = function (n, callback) {
  for (var i = 0; i < n; ++i) callback(i);
};

// Fetch shader from <script> tag by id
ThreeRTT.getShader = function (id) {
  var elem = document.getElementById(id);
  return elem && (elem.innerText || elem.textContent) || id;
};
// Check for a power of two.
ThreeRTT.isPowerOfTwo = function (value) {
	return (value & (value - 1)) === 0;
};

// Convert World/Stage into RenderTarget if necessary.
ThreeRTT.toTarget = function (rtt) {
  // Stage object
  if (ThreeRTT.Stage && (rtt instanceof ThreeRTT.Stage)) return rtt.target;
  // tQuery world
  if (ThreeRTT.World && (rtt instanceof ThreeRTT.World)) return rtt.target();
  // RenderTarget or texture
  return rtt;
}

// Convert World/Stage/RenderTarget into texture uniform.
ThreeRTT.toTexture = function (rtt, i) {
  // Convert World/Stage
  rtt = ThreeRTT.toTarget(rtt);
  // Convert virtual RenderTarget object to uniform
  if (ThreeRTT.RenderTarget && (rtt instanceof ThreeRTT.RenderTarget)) return rtt.read();
  return rtt;
}

// Make microevent methods chainable.
MicroEvent.prototype.on   = function () { MicroEvent.prototype.bind.apply(this, arguments);    return this; }
MicroEvent.prototype.emit = function () { MicroEvent.prototype.trigger.apply(this, arguments); return this; }
MicroEvent.mixin	= function(destObject){
	var props	= ['bind', 'unbind', 'trigger', 'on', 'emit'];
	for(var i = 0; i < props.length; i ++){
		destObject.prototype[props[i]]	= MicroEvent.prototype[props[i]];
	}
}
/**
 * Render-to-texture stage. Contains scene/camera/target + optional full screen quad.
 */
ThreeRTT.Stage = function (renderer, options) {
  options = _.extend({
    history:  0,
    camera:   {},
    scene:    null,
  }, options);

  // Prefill aspect ratio.
  options.camera.aspect = options.camera.aspect || (options.width / options.height);

  // Create internal scene and default camera.
  this.camera = ThreeRTT.Camera(options.camera);

  // Create virtual render target, passthrough options.
  this.target = new ThreeRTT.RenderTarget(renderer, options);

  // Prepare data structures.
  this.reset();

  // Set size and aspect
  this.size(options.width, options.height);
}

ThreeRTT.Stage.prototype = {

  options: function () {
    return this.target.options;
  },

  reset: function () {
    this.scenes   = [];
    this.passes   = [];
  },

  // Add object render pass
  paint: function (object, empty) {

    // Create root to hold all objects for this pass
    var root = new THREE.Scene();

    // Create a surface to render the last frame
    if (!empty) {
      var material = new ThreeRTT.FragmentMaterial(this, 'generic-fragment-texture');
      var surface = this._surface(material);
      root.add(surface);
    }

    // Add object
    root.add(object);

    // Add root to scene and insert into pass list
    this.scenes.push(root);
    this.passes.push(1);
  },

  // Add iteration pass
  iterate: function (n, material) {

    // Create a surface to render the pass with
    var surface = this._surface(material);

    // Create root to hold all objects for this pass
    var root = new THREE.Scene();
    root.add(surface);

    // Add surface to scene and insert into pass list
    this.scenes.push(root);
    this.passes.push(n);

    return this;
  },

  // Add regular fragment pass
  fragment: function (material) {
    this.iterate(1, material);

    return this;
  },

  // Resize render-to-texture
  size: function (width, height) {
    width = Math.floor(width);
    height = Math.floor(height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.target.size(width, height);
    return this;
  },

  // Get texture for render-to-texture output delayed by n frames.
  read: function (n) {
    return this.target.read(n);
  },

  // Return uniform for reading from this render target
  uniform: function () {
    return this.target.uniform();
  },

  // Render virtual render target.
  render: function () {
	  this.target.clear();

    _.each(this.passes, function (n, i) {
      _.loop(n, function (j) {
        this.target.render(this.scenes[i], this.camera);
      }.bind(this));
    }.bind(this));

    return this;
  },

  // Clear virtual render target.
  clear: function () {
    this.target.clear();
    return this;
  },

  // Cleanup resources.
  destroy: function () {
    this.target.deallocate();

    this.scenes = [];
    this.passes = [];
    this.camera = null;
    this.target = null;
  },

  // Generate full screen surface with default properties.
  _surface: function (material) {
    var surface = new THREE.Mesh(new ThreeRTT.ScreenGeometry(), {});
    surface.frustumCulled = false;
    surface.material = material;
    surface.renderDepth = Infinity;

    return surface;
  },

}
/**
 * Compose render-to-textures into a scene by adding a full screen quad
 * that uses the textures as inputs.
 */
ThreeRTT.Compose = function (rtts, fragmentShader, textures, uniforms) {
  THREE.Object3D.call(this);

  // Create full screen quad.
  var material = new ThreeRTT.FragmentMaterial(rtts, fragmentShader, textures, uniforms);
  var geometry = new ThreeRTT.ScreenGeometry();
  var mesh = this.mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  this.add(mesh);
}

ThreeRTT.Compose.prototype = new THREE.Object3D();
// Handy Camera factory
ThreeRTT.Camera = function (options) {
  // Camera passthrough
  if (options instanceof THREE.Camera) return options;

  // Defaults
  options = _.extend({
    aspect: 1,
    far: 10000,
    fov: 85,
    near: .01,
    ortho: false,
    scale: 1//,
  }, options);

  if (options.ortho) {
    // Note: aspect ratio is applied after.
    var s = options.scale, a = options.aspect;
    return new THREE.OrthographicCamera(
                      -s * a,
                       s * a,
                      -s,
                       s,
                       options.near,
                       options.far);
  }
  else {
    return new THREE.PerspectiveCamera(
                       options.fov,
                       options.aspect,
                       options.near,
                       options.far);
  }
};
/**
 * Virtual render target for complex render-to-texture usage.
 *
 * Contains multiple buffers for rendering from/to itself transparently
 * and/or remembering multiple frames of history.
 * 
 * Set options.history to the number of frames of history needed (default 0).
 *
 * Render a frame:
 * .render(scene, camera)
 *
 * Clear the frame:
 * .clear(color, depth, stencil)
 *
 * Retrieve a virtual render target/texture to read from past frames:
 * .read()/.read(0), .read(-1), .read(-2), ..
 *
 * Set dimensions:
 * .size(width, height)
 *
 * Retrieve render target for manually rendering into:
 * .write()
 *
 * Advanced cyclic buffer manually:
 * .advance()
 */
ThreeRTT.RenderTarget = function (renderer, options) {
  this.options = options = _.extend({
    width:         256,
    height:        256,
    texture:       {},
    clear:         { color: false, depth: false, stencil: false },
    clearColor:    0xFFFFFF,
    clearAlpha:    1,
    history:       0,
    scene:         null,
    camera:        null,
    autoAdvance:   true//,
  }, options);
  this.renderer = renderer;

  // Make sure mip-mapping is disabled for non-power-of-two targets.
  if (!ThreeRTT.isPowerOfTwo(options.width) ||
      !ThreeRTT.isPowerOfTwo(options.height)) {
    if (!options.texture.minFilter) {
      options.texture.minFilter = THREE.LinearFilter;
    }
  }

  // Number of buffers = history + read/write
  this.history(this.options.history, true);

  // Set size and allocate render targets.
  this.size(options.width, options.height);

  // Clear buffer
  this.clear();
},

ThreeRTT.RenderTarget.prototype = {

  // Retrieve virtual target for reading from, n frames back.
  read: function (n) {
    // Clamp history to available buffers minus write buffer.
    n = Math.max(0, Math.min(this.options.history, Math.abs(n || 0)));
    return this.virtuals[n];
  },

  // Retrieve real render target for writing/rendering to.
  write: function () {
    return this.targets[this.index];
  },

  // Retrieve / change history count
  history: function (history, ignore) {
    if (history !== undefined) {
      this._history = history;
      this.buffers = history + 2;

      // Refresh/allocate targets.
      ignore || this.allocate();
    }
    return this._history;
  },

  // Retrieve / change size
  size: function (width, height) {
    if (width !== undefined && height !== undefined) {
      // Round floats to ints to help with half/quarter derived sizes.
      this.width = width = Math.max(1, Math.floor(width));
      this.height = height = Math.max(1, Math.floor(height));

      // Refresh/allocate targets.
      this.allocate();
    }

    return { width: this.width, height: this.height };
  },

  // Reallocate all targets.
  deallocate: function () {
    this.deallocateTargets();
  },

  // Reallocate all targets.
  allocate: function () {
    this.deallocateTargets();
    this.allocateTargets();
    this.allocateVirtuals();
  },

  // (Re)allocate render targets
  deallocateTargets: function () {
    // Deallocate real targets that were used in rendering.
    _.each(this.targets || [], function (target) {
      target.dispose && target.dispose();
    }.bind(this));
  },

  // (Re)allocate render targets
  allocateTargets: function () {
    var options = this.options;
              n = this.buffers;

    // Allocate/Refresh real render targets
    var targets = this.targets = [];
    _.loop(n, function (i) {

      targets.push(new THREE.WebGLRenderTarget(
        this.width,
        this.height,
        options.texture
      ));
      targets[i].__index = i;
    }.bind(this));
  },

  // Prepare virtual render targets for reading/writing.
  allocateVirtuals: function () {
    var original = this.targets[0],
        virtuals  = this.virtuals || [];
        n = Math.max(1, this.buffers - 1);
        // One buffer reserved for writing at any given time,
        // unless there is no history.

    // Keep virtual targets around if possible.
    if (n > virtuals.length) {
      _.loop(n - virtuals.length, function () {
        virtuals.push(original.clone());
      }.bind(this));
    }
    else {
      virtuals = virtuals.slice(0, n);
    }

    // Set sizes of virtual render targets.
    _.each(virtuals, function (target, i) {
      target.width = this.width;
      target.height = this.height;
      target.__index = i;
    }.bind(this));

    this.virtuals = virtuals;

    // Reset index and re-init targets.
    this.index = -1;
    this.advance();
  },

  // Advance through buffers.
  advance: function () {
    var options  = this.options,
        targets  = this.targets,
        virtuals = this.virtuals,
        index    = this.index,
        n        = this.buffers,
        v        = virtuals.length;

    // Advance cyclic index.
    this.index = index = (index + 1) % n;

    // Point virtual render targets to last rendered frame(s) in order.
    _.loop(v, function (i) {
      var dst = virtuals[i],
          src = targets[(v - i + index) % n];

      dst.__webglTexture      = src.__webglTexture;
      dst.__webglFramebuffer  = src.__webglFramebuffer;
      dst.__webglRenderbuffer = src.__webglRenderbuffer;
      dst.__index             = src.__index;
    });

  },

  // Clear render target.
  clear: function () {
    var options = this.options,
        clear   = options.clear,
        renderer = this.renderer;

    // Read old clearing state
    var color = renderer.getClearColor().clone();
    var alpha = renderer.getClearAlpha();

    // Apple new clearing color
    renderer.setClearColor(options.clearColor, options.clearAlpha);
    renderer.clearTarget(this.write(), clear.color, clear.depth, clear.stencil);

    // Reset state
    renderer.setClearColor(color, alpha);
  },

  // Render to render target using given renderer.
  render: function (scene, camera) {
    // Make sure materials are given a chance to update their uniforms.
    this.emit('render', scene, camera);

    // Disable autoclear.
    var autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    // Clear manually (with correct flags).
    this.clear();

    // Render scene.
    this.renderer.render(scene, camera, this.write());

    // Restore autoclear to previous state.
    this.renderer.autoClear = autoClear;

    // Advance render buffers so newly rendered frame is at .read(0).
    this.options.autoAdvance && this.advance();
  },

  // Return uniform for reading from this renderTarget.
  uniform: function (i) {
    var n = this.history();
    if (n) {
      // Expose frame history as array of textures.
      var textures = [];
      _.loop(n + 1, function (j) {
        textures.push(this.read(-j));
      }.bind(this));
      return {
        type: 'tv',
        value: textures,
        count: n + 1//,
      };
    }
    else {
      // No history, expose a single read texture.
      return {
        type: 't',
        value: i,
        texture: this.read(),
        count: 1//,
      };
    }
  }//,

};

// Microeventable
MicroEvent.mixin(ThreeRTT.RenderTarget);
/**
 * Geometry for drawing a full screen quad for raytracing / render-to-texture purposes.
 */
ThreeRTT.ScreenGeometry = function () {
  return new THREE.PlaneGeometry(2, 2, 1, 1);
};
/**
 * Helper for making ShaderMaterials that read from textures and write out processed fragments.
 */
ThreeRTT.ShaderMaterial = function (renderTargets, vertexShader, fragmentShader, textures, uniforms) {

  // Autoname texture uniforms as texture1, texture2, ...
  function textureName(j) {
    return 'texture' + (j + 1);
  }

  // Allow for array of textures.
  if (textures instanceof Array) {
    var object = {};
    _.each(textures, function (texture, j) {
      object[textureName(i)] = texture;
    });
    textures = object;
  }
  // Allow passing single texture/object
  else if (textures instanceof THREE.Texture
        || textures instanceof ThreeRTT.World
        || textures instanceof THREE.WebGLRenderTarget) {
    textures = { texture1: textures };
  }

  // Accept one or more render targets as input for reading.
  if (!(renderTargets instanceof Array)) {
    renderTargets = [renderTargets];
  }

  // Accept World/Stage/RenderTarget classes
  renderTargets = _.map(renderTargets, function (target) {
    return ThreeRTT.toTarget(target);
  });

  // Add sample step uniform.
  uniforms = _.extend(uniforms || {}, {
    sampleStep: {
      type: 'v2',
      value: new THREE.Vector2()//,
    }//,
  });

  // Make uniforms for input textures.
  _.each(textures, function (texture, key) {
    uniforms[key] = {
      type: 't',
      value: ThreeRTT.toTexture(texture)//,
    };
  });

  // Use render targets as input textures unless overridden.
  _.each(renderTargets, function (target, j) {
    // Create texture1, texture2, ... uniforms.
    var key = textureName(j);
    if (target.read && !uniforms[key]) {
      uniforms[key] = {
        type: 't',
        value: target.read()//,
      };
    }
  });

  // Alias 'texture1' to 'texture'.
  if (uniforms.texture1 && !uniforms.texture) {
    uniforms.texture = uniforms.texture1;
  }

  // Update sampleStep uniform on render of source.
  var callback;
  renderTargets[0].on('render', callback = function () {
    var texture = renderTargets[0].options.texture;
    var wrapS = texture.wrapS;
    var wrapT = texture.wrapT;

    var offset = {
      1000: 0, // repeat
      1001: 1, // clamp
      1002: 0, // mirrored
    };

    var value = uniforms.sampleStep.value;

    value.x = 1 / (renderTargets[0].width - (offset[wrapS]||0));
    value.y = 1 / (renderTargets[0].height - (offset[wrapT]||0));
  });

  // Lookup shaders and build material
  var material = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader(vertexShader || 'generic-vertex'),
    fragmentShader: ThreeRTT.getShader(fragmentShader || 'generic-fragment-texture')//,
  });

  return material;
};
/**
 * Helper for making ShaderMaterials that read from textures and write out processed fragments.
 */
ThreeRTT.FragmentMaterial = function (renderTargets, fragmentShader, textures, uniforms) {

  var material = new ThreeRTT.ShaderMaterial(
                  renderTargets, 'generic-vertex-screen', fragmentShader, textures, uniforms);

  // Disable depth buffer for RTT fragment operations by default.
  material.side = THREE.DoubleSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.transparent = true;
  material.blending = THREE.NoBlending;

  return material;
};
/**
 * Specialized ShaderMaterial for up/downsampling a texture by a factor of 2 with anti-aliasing.
 */
ThreeRTT.ScaleMaterial = function (renderTargetFrom, renderTargetTo, scale) {
  var uniforms = {};

  // Accept both Stage and RenderTarget classes
  renderTargetFrom = ThreeRTT.toTarget(renderTargetFrom);
  renderTargetTo = ThreeRTT.toTarget(renderTargetTo);

  // Add uniforms.
  uniforms = _.extend(uniforms, {
    sampleAlignment: {
      type: 'v2',
      value: new THREE.Vector2()//,
    },
    texture: {
      type: 't',
      value: renderTargetFrom.read()//,
    }//,
  });

  // Update uniforms on render.
  renderTargetTo.on('render', function () {
    var from = renderTargetFrom,
        to = renderTargetTo;

    // Correction for odd downsample.
    var dx = (to.width * scale) / from.width,
        dy = (to.height * scale) / from.height;

    var value = uniforms.sampleAlignment.value;
    value.x = dx;
    value.y = dy;
  });

  // Lookup shaders and build material
  var material = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader('rtt-vertex-downsample'),
    fragmentShader: ThreeRTT.getShader('generic-fragment-texture')//,
  });

  // Disable depth buffer for RTT operations by default.
  material.side = THREE.DoubleSide;
  material.depthTest = false;
  material.depthWrite = false;
  material.transparent = true;
  material.blending = THREE.NoBlending;

  return material;
};

/**
 * Helper classes
 */
ThreeRTT.DownsampleMaterial = function (renderTargetFrom, renderTargetTo) {
  return new ThreeRTT.ScaleMaterial(renderTargetFrom, renderTargetTo, 2);
}
ThreeRTT.UpsampleMaterial = function (renderTargetFrom, renderTargetTo) {
  return new ThreeRTT.ScaleMaterial(renderTargetFrom, renderTargetTo, 0.5);
}
/**
 * Helper for making ShaderMaterials that raytrace in camera space per pixel.
 */
ThreeRTT.RaytraceMaterial = function (renderTargets, camera, fragmentShader, textures, uniforms) {

  // Accept one or more render targets as input for reading.
  if (!(renderTargets instanceof Array)) {
    renderTargets = [renderTargets];
  }

  var material = new ThreeRTT.ShaderMaterial(
                  renderTargets, 'raytrace-vertex-screen', fragmentShader, textures, uniforms);

  // Add camera uniforms.
  uniforms = _.extend(material.uniforms || {}, {
    raytraceViewport: {
      type: 'v2',
      value: new THREE.Vector2(),
    },
    raytracePosition: {
      type: 'v3',
      value: new THREE.Vector3(),
    },
    raytraceMatrix: {
      type: 'm4',
      value: new THREE.Matrix4(),
    },
  });

  // Update camera uniforms on render.
  var renderTarget = ThreeRTT.toTarget(renderTargets[0]);
  var zero = new THREE.Vector3();
  renderTarget.on('render', function (scene) {
    camera.updateMatrixWorld();
    if (camera.fov) {
      var tan = Math.tan(camera.fov * π / 360);
      uniforms.raytraceViewport.value.set(tan * camera.aspect, tan);
    }
    if (camera.matrixWorld) {
      uniforms.raytraceMatrix.value.copy(camera.matrixWorld);
      uniforms.raytraceMatrix.value.setPosition(zero);
      uniforms.raytracePosition.value.getPositionFromMatrix(camera.matrixWorld);
    }
  });

  // Lookup shaders and build material
  return material;
};/**
 * Debug/testing helper that displays the given rendertargets in a grid
 */
ThreeRTT.Display = function (targets, gx, gy) {
  if (!(targets instanceof Array)) {
    targets = [targets];
  }

  this.gx = gx || targets.length;
  this.gy = gy || 1;
  this.targets = targets;
  this.n = targets.length;

  THREE.Object3D.call(this);
  this.make();
}

ThreeRTT.Display.prototype = _.extend(new THREE.Object3D(), {

  make: function () {
    var n = this.n,
        gx = this.gx,
        gy = this.gy,
        targets = this.targets;

    var igx = (gx - 1) / 2,
        igy = (gy - 1) / 2;

    var geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    var i = 0;
    for (var y = 0; i < n && y < gy; ++y) {
      for (var x = 0; i < n && x < gx; ++x, ++i) {
        var material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          map: ThreeRTT.toTexture(targets[i]),
          fog: false
        });
        material.side = THREE.DoubleSide;

        var mesh = new THREE.Mesh(geometry, material);
        mesh.renderDepth = 10000 + Math.random();
        this.add(mesh);

        if (gx > 1) mesh.position.x = -igx + x;
        if (gy > 1) mesh.position.y =  igy - y;
      }
    }
  }

});/**
 * Handle a world for rendering to texture (tQuery).
 *
 * @param world (object) World to sync rendering to.
 */
ThreeRTT.World  = function (world, options) {
  // Handle parameters.
  options = options || {};
  options = _.extend({
    autoRendering: true,
    autoSize:      !(options.width && options.height), // Default to autosize if no size specified
    order:         ++ThreeRTT.World.sequence,
    scale:         1//,
  }, options);

  // Inherit size from world
  options.width  = (!options.autoSize && options.width)
                   || ((world._opts && world._opts.renderW || 256) / options.scale);
  options.height = (!options.autoSize && options.height)
                   || ((world._opts && world._opts.renderH || 256) / options.scale);

  // Bind to world resize event for ThreeBox.js auto-resize.
  world.on('resize', function (width, height) {
    if (!options.autoSize) return;

    width /= options.scale;
    height /= options.scale;

    // Resize render target
    this.size(width, height);
  }.bind(this));

  // Remember creation state.
  this._options = options;
  this._world   = world;
  this._autoRendering  = options.autoRendering;

  // Copy renderer.
  this._renderer = world.tRenderer();

  // Create an RTT stage, pass-thru options.
  this._stage = new ThreeRTT.Stage(this._renderer, options);

  // Expose scene and camera
  this._tScene  = this._stage.scene;
  this._tCamera = this._stage.camera;

  // Add to RTT queue at specified order.
  this.queue = ThreeRTT.RenderQueue.bind(world);
  if (options.autoRendering) this.queue.add(this);

  // Update sizing state
  this.size(options.width, options.height, true);
};

// All non-ordered passes go last, in order of addition.
ThreeRTT.World.sequence = 100000;

ThreeRTT.World.prototype = _.extend(new THREE.Object3D(), tQuery.World.prototype, {

  // Return the stage object.
  stage: function () {
    return this._stage;
  },

  // Return the virtual render target object.
  target: function () {
    return this._stage.target;
  },

  // Change the autosize behavior.
  autoSize: function (autoSize) {
    if (autoSize !== undefined) {
      this._options.autoSize = autoSize;
    }
    return this._options.autoSize;
  },

  // Adjust in response to size changes
  adjust: function (ignore) {
    var scale = this._options.scale;
    var width = this._options.width,
        height = this._options.height;

    if (this._options.autoSize) {
      // Resize immediately based off parent scale.
      var opts = this._world._opts;
      width = opts.renderW,
      height = opts.renderH;
    }

    width /= scale;
    height /= scale;

    // Compatibility with tQuery world
    this._opts = {
      renderW: width ,
      renderH: height//,
    };

    // Ignore on init.
    ignore || this._stage.size(width, height)
  },

  // Change the autoscale factor
  scale: function (scale) {
    if (scale) {
      this._options.scale = scale;
      this.adjust();
      return this;
    }

    return this._options.scale;
  },

  // Resize the RTT texture.
  size: function (width, height, ignore) {
    if (width && height) {
      this._options.width = width;
      this._options.height = height;

      // Ignore on init.
      this.adjust(ignore);
      return this;
    }

    return { width: this._options.width, height: this._options.height };
  },

  // Get stage options
  options: function () {
    return this._stage.options();
  },

  // Reset all passes
  reset: function () {
    this._stage.reset();
    return this;
  },

  // Add a painting rendering pass
  paint: function (object, empty) {
    this._stage.paint(object, empty);
    return this;
  },

  // Add an iterated rendering pass
  iterate: function (n, fragmentShader, textures, uniforms) {
    var material = fragmentShader instanceof THREE.Material
                 ? fragmentShader
                 : tQuery.createFragmentMaterial(
                    this, fragmentShader, textures, uniforms);

    this._stage.iterate(n, material);
    return this;
  },

  // Add a shader rendering pass
  shader: function (vertexShader, fragmentShader, textures, uniforms) {
    var material = vertexShader instanceof THREE.Material
                 ? vertexShader
                 : tQuery.createShaderMaterial(
                    this, vertexShader, fragmentShader, textures, uniforms);

    this._stage.fragment(material);
    return this;
  },

  // Add a fragment rendering pass
  fragment: function (fragmentShader, textures, uniforms) {
    var material = fragmentShader instanceof THREE.Material
                 ? fragmentShader
                 : tQuery.createFragmentMaterial(
                    this, fragmentShader, textures, uniforms);

    this._stage.fragment(material);
    return this;
  },

  // Add a raytrace rendering pass
  raytrace: function (camera, fragmentShader, textures, uniforms) {
    var material = fragmentShader instanceof THREE.Material
                 ? fragmentShader
                 : tQuery.createRaytraceMaterial(
                    this, camera, fragmentShader, textures, uniforms);

    this._stage.fragment(material);
    return this;
  },

  // Add a downsample rendering pass
  downsample: function (worldFrom) {
    // Force this world to right size now if not autosizing
    if (!worldFrom.autoSize()) {
      var size = worldFrom.size();
      this._options.width = size.width;
      this._options.height = size.height;
    }

    // Force this world to right scale (will autosize)
    var scale = worldFrom.scale();
    this.scale(scale * 2);

    var material = tQuery.createDownsampleMaterial(worldFrom, this);
    this._stage.fragment(material);

    return this;
  },

  // Add an upsample rendering pass
  upsample: function (worldFrom) {
    // Force this world to right size now if not autosizing
    if (!worldFrom.autoSize()) {
      var size = worldFrom.size();
      this._options.width = size.width;
      this._options.height = size.height;
    }

    // Force this world to right scale (will autosize)
    var scale = worldFrom.scale();
    this.scale(scale * 0.5);

    var material = tQuery.createUpsampleMaterial(worldFrom, this);
    this._stage.fragment(material);

    return this;
  },

  // Return the virtual texture for reading from this RTT stage.
  read: function (n) {
    return this._stage.read(n);
  },

  // Return uniform for reading from this render target
  uniform: function () {
    return this._stage.uniform();
  },

  // Render this world.
  render: function () {
    // Render to write target.
    this._stage.render();

    return this;
  },

  // Destroy/unlink this world.
  destroy: function () {
    // Remove stage.
    this._stage.destroy();
    this._stage = null;

  	// Remove self from rendering queue.
    this.queue.remove(this);

  	// Microevent.js notification
  	this.trigger('destroy');

    return this;
  }
});

// Make it pluginable.
tQuery.pluginsInstanceOn(ThreeRTT.World);

// Make it eventable.
tQuery.MicroeventMixin(ThreeRTT.World.prototype)
/**
 * Priority queue for render-to-texture stages (tQuery).
 *
 * Attach a weighted queue to the given world, rendered before the world itself.
 */
ThreeRTT.RenderQueue = function (world) {
  this.world = world;
  this.queue = [];
  this.callback = null;

  this.renderer = world.tRenderer();
};

ThreeRTT.RenderQueue.prototype = {
  // Add render stage to queue
  add: function (stage) {
    this.queue.push(stage);
    this.sort();
    this.init();
  },

  // Remove render stage from queue.
  remove: function (stage) {
    this.queue.splice(this.queue.indexOf(stage), 1);
    this.cleanup();
  },

  // Ensure we are hooked into the world's rendering pipeline.
  init: function () {
    var queue = this.queue,
        world = this.world;

    if (queue.length && !this.callback) {
      world.loop().hookPreRender(this.callback = function () {
        _.each(queue, function (stage) {
          stage.render();
        });
      });
    }
  },

  // Unhook from world if no longer needed.
  cleanup: function () {
    var queue = this.queue,
        world = this.world;

    if (!queue.length && this.callback) {
      world.loop().unhookPreRender(this.callback);
      this.callback = null;
    }
  },

  // Sort queue by given order.
  sort: function () {
    this.queue.sort(function (a, b) {
      return a.order - b.order;
    });
  }
};

/**
 * Helper to return the single RenderQueue associated with a world.
 */
ThreeRTT.RenderQueue.bind = function (world) {
  var key = '__rttRenderQueue';

  // Singleton attached to world.
  if (world[key]) {
    return world[key];
  }
  return (world[key] = new ThreeRTT.RenderQueue(world));
}
/**
 * Create a render-to-texture world for this world.
 */
tQuery.World.registerInstance('rtt', function (options) {
  return tQuery.createRTT(this, options);
});

/**
 * Add a surface composing a render-to-texture to the screen.
 */
tQuery.World.registerInstance('compose', function (rtts, fragmentShader, textures, uniforms) {
  var compose = tQuery.createComposeRTT(rtts, fragmentShader, textures, uniforms);
  this.add(compose);
  return compose;
});

/**
 * Add a surface showing a render-to-texture surface to this world.
 */
tQuery.World.registerInstance('display', function (targets, gx, gy) {
  var display = tQuery.createDisplayRTT(targets, gx, gy);
  this.add(display);
  return display;
});

/**
 * Create a render-to-texture world (static).
 */
tQuery.registerStatic('createRTT', function (world, options) {
  // Create new RTT world.
  return new ThreeRTT.World(world, options);
});

/**
 * Composite a render-to-texture image full screen
 */
tQuery.registerStatic('createComposeRTT', function (rtts, fragmentShader, textures, uniforms) {
  return new ThreeRTT.Compose(rtts, fragmentShader, textures, uniforms);
});

/**
 * Create a display surface showing one or more textures in a grid.
 */
tQuery.registerStatic('createDisplayRTT', function (targets, gx, gy) {
  return new ThreeRTT.Display(targets, gx, gy);
});

/**
 * Create a ShaderMaterial.
 */
tQuery.registerStatic('createShaderMaterial', function (worlds, vertexShader, fragmentShader, textures, uniforms) {
  return new ThreeRTT.FragmentMaterial(worlds, vertexShader, fragmentShader, textures, uniforms);
});

/**
 * Create a FragmentMaterial.
 */
tQuery.registerStatic('createFragmentMaterial', function (worlds, fragmentShader, textures, uniforms) {
  return new ThreeRTT.FragmentMaterial(worlds, fragmentShader, textures, uniforms);
});

/**
 * Create a RaytraceMaterial.
 */
tQuery.registerStatic('createRaytraceMaterial', function (world, camera, fragmentShader, textures, uniforms) {
  return new ThreeRTT.RaytraceMaterial(world, camera, fragmentShader, textures, uniforms);
});

/**
 * Create a DownsampleMaterial.
 */
tQuery.registerStatic('createDownsampleMaterial', function (worldFrom, worldTo) {
  return new ThreeRTT.DownsampleMaterial(worldFrom, worldTo);
});

/**
 * Create a UpsampleMaterial.
 */
tQuery.registerStatic('createUpsampleMaterial', function (worldFrom, worldTo) {
  return new ThreeRTT.UpsampleMaterial(worldFrom, worldTo);
});

/**
 * Create a ScaleMaterial.
 */
tQuery.registerStatic('createScaleMaterial', function (worldFrom, worldTo, scale) {
  return new ThreeRTT.DownsampleMaterial(worldFrom, worldTo, scale);
});
