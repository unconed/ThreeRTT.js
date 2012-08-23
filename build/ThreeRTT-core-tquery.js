// Check dependencies.
(function (deps) {
  for (i in deps) {
    if (!window[i]) throw "Error: ThreeRTT requires " + deps[i];
  }
})({
  'THREE': 'Three.js'//,
});

// Namespace
window.ThreeRTT = window.ThreeRTT || {};

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
  return elem && elem.innerText || id;
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
  // RenderTarget
  return rtt;
}

// Convert World/Stage/RenderTarget into texture uniform.
ThreeRTT.toTexture = function (rtt, i) {
  // Convert World/Stage
  rtt = ThreeRTT.toTarget(rtt);
  // Convert virtual RenderTarget object to uniform
  if (ThreeRTT.RenderTarget && (rtt instanceof ThreeRTT.RenderTarget)) return rtt.read();
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
    material: false, 
    scene:    null//,
  }, options);

  // Prefill aspect ratio.
  options.camera.aspect = options.camera.aspect || (options.width / options.height);

  // Create internal scene and default camera.
  this.scene = options.scene || new THREE.Scene();
  this.camera = ThreeRTT.Camera(options.camera);
	this.scene.add(this.camera);

  // Create virtual render target, passthrough options.
  this.target = new ThreeRTT.RenderTarget(renderer, options);

  // If using buffered mode, draw the last rendered frame as background 
  // to avoid flickering unless overridden.
  if (options.history >= 0) {
    options.material = options.material || new ThreeRTT.FragmentMaterial(this);
  }

  // Prepare full-screen quad to help render every pixel once (baking textures).
  if (options.material) {
    this.material(true, options.material);
  }
}

ThreeRTT.Stage.prototype = {

  // Set/remove the default full-screen quad surface material
  material: function (material) {
    if (material) {
      // Spawn fullscreen quad.
      if (!this._surface) {
        this._surface = new THREE.Mesh(new ThreeRTT.ScreenGeometry(), {});
        this.scene.add(this._surface);
      }
      this._surface.material = material;
    }
    else {
      // Remove fullscreen quad.
      this.scene.remove(this._surface);
      this._surface = null;
    }

    return this;
  },

  // Resize render-to-texture
  size: function (width, height) {
    this.camera.aspect = width / height;
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
    this.target.render(this.scene, this.camera);
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

    this.scene = null;
    this.camera = null;
    this.target = null;
  }
}
/**
 * Compose render-to-textures into a scene by adding a full screen quad
 * that uses the textures as inputs.
 */
ThreeRTT.Compose = function (scene, rtts, fragmentShader, textures, uniforms) {
  // Create full screen quad.
  var material = new ThreeRTT.FragmentMaterial(rtts, fragmentShader, textures, uniforms);
  var geometry = new ThreeRTT.ScreenGeometry();
  var mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Remember scene/mesh association.
  this.scene = scene;
  this.mesh = mesh;
}

// Remove fullscreen quad
ThreeRTT.Compose.prototype.remove = function () {
  this.scene.remove(this.mesh);
};
// Handy Camera factory
ThreeRTT.Camera = function (options) {
  // Camera passthrough
  if (options.constructor instanceof THREE.Camera) return options;

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
    clear:         { color: false, depth: true, stencil: true },
    clearColor:    0xFFFFFF,
    clearAlpha:    0,
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
},

ThreeRTT.RenderTarget.prototype = {

  // Retrieve virtual target for reading from, n frames back.
  read: function (n) {
    // Clamp history to available buffers minus write buffer.
    n = Math.min(this.options.history, Math.abs(n || 0));
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
    if (width && height) {
      // Round floats to ints to help with half/quarter derived sizes.
      this.width = width = Math.floor(width);
      this.height = height = Math.floor(height);

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
      this.renderer.deallocateRenderTarget(target);
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
        n = this.buffers - 1; // One buffer reserved for writing at any given time

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
        n        = this.buffers;

    // Advance cyclic index.
    this.index = index = (index + 1) % n;

    // Point virtual render targets to last rendered frame(s) in order.
    _.loop(n - 1, function (i) {
      var dst = virtuals[i],
          src = targets[(n - 1 - i + index) % n];

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

    renderer.setClearColorHex(options.clearColor, options.clearAlpha);
    renderer.clearTarget(this.write(), clear.color, clear.stencil, clear.depth);
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
        value: i,
        texture: textures,
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
ThreeRTT.FragmentMaterial = function (renderTargets, fragmentShader, textures, uniforms) {
  textures = textures || {};

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
  else if (textures.constructor != Object) {
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
      texture: ThreeRTT.toTexture(texture)//,
    };
  });

  // Use render targets as input textures unless overridden.
  _.each(renderTargets, function (target, j) {
    // Create texture1, texture2, ... uniforms.
    var key = textureName(j);
    if (!uniforms[key]) {
      uniforms[key] = {
        type: 't',
        texture: target.read()//,
      };
    }
  });

  // Assign texture indices to uniforms.
  var i = 0;
  _.each(uniforms, function (uniform, key) {
    if (uniform.type == 't') {
      return uniform.value = i++;
    }
    if (uniform.type == 'tv') {
      uniform.value = i;
      i += uniform.texture.length;
    }
  });

  // Alias 'texture1' to 'texture'.
  if (uniforms.texture1 && !uniforms.texture) {
    uniforms.texture = uniforms.texture1;
  }

  console.log(fragmentShader, uniforms);

  // Update sampleStep uniform on render of source.
  renderTargets[0].on('render', function () {
    var value = uniforms.sampleStep.value;

    value.x = 1 / (renderTargets[0].width - 1);
    value.y = 1 / (renderTargets[0].height - 1)
  });

  // Lookup shaders and build material
  var material = new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader('generic-vertex-screen'),
    fragmentShader: ThreeRTT.getShader(fragmentShader || 'generic-fragment-texture')//,
  });

  // Disable depth buffer for RTT operations.
  //material.depthTest = false;
  //material.depthWrite = false;
  //material.transparent = true;

  return material;
};/**
 * Specialized ShaderMaterial for downsampling a texture by a factor of 2 with anti-aliasing.
 */
ThreeRTT.DownsampleMaterial = function (renderTargetFrom, renderTargetTo) {
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
      value: 0,
      texture: renderTargetFrom.read()//,
    }//,
  });

  // Update uniforms on render.
  renderTargetTo.on('render', function () {
    var from = renderTargetFrom,
        to = renderTargetTo;

    // Correction for odd downsample.
    var dx = (to.width * 2) / from.width,
        dy = (to.height * 2) / from.height;

    var value = uniforms.sampleAlignment.value;
    value.x = dx;
    value.y = dy;
  });

  // Lookup shaders and build material
  return new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader('rtt-vertex-downsample'),
    fragmentShader: ThreeRTT.getShader('generic-fragment-texture')//,
  });
};/**
 * Helper for making ShaderMaterials that raytrace in camera space per pixel.
 */
ThreeRTT.RaytraceMaterial = function (renderTarget, fragmentShader, textures, uniforms) {

  // Autoname texture uniforms as texture1, texture2, ...
  function textureName(j) {
    return 'texture' + (j + 1);
  }

  // Allow for array of textures.
  if (textures instanceof Array) {
    var object = {};
    _.each(textures, function (texture, j) {
      // Autoname texture uniforms as texture1, texture2, ...
      var key = textureName(j);
      object[key] = texture;
    });
  }
  // Allow passing single texture/object
  else if (textures.constructor != Object) {
    textures = { texture1: textures };
  }

  // Accept both Stage and RenderTarget classes
  renderTarget = ThreeRTT.toTarget(renderTarget);

  // Add camera uniforms.
  uniforms = _.extend(uniforms || {}, {
    cameraViewport: {
      type: 'v2',
      value: new THREE.Vector2()//,
    },
    cameraWorld: {
      type: 'm4',
      value: new THREE.Matrix4()//,
    }//,
  });

  // Make uniforms for input textures.
  var i = 0;
  _.each(textures || [], function (texture, key) {
    uniforms[key] = {
      type: 't',
      value: i++,
      texture: ThreeRTT.toTexture(texture)//,
    };
  });

  // Update camera uniforms on render.
  renderTarget.on('render', function (scene, camera) {
    camera.updateMatrixWorld();
    if (camera.fov) {
      var tan = Math.tan(camera.fov * π / 360);
      uniforms.cameraViewport.value.set(tan * camera.aspect, tan);
    }
    if (camera.matrixWorld) {
      uniforms.cameraWorld.value = camera.matrixWorld;
    }
  });

  // Lookup shaders and build material
  return new THREE.ShaderMaterial({
    uniforms:       uniforms,
    vertexShader:   ThreeRTT.getShader('generic-vertex-screen'),
    fragmentShader: ThreeRTT.getShader(fragmentShader)//,
  });
};/**
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
  this._scene  = this._stage.scene;
  this._camera = this._stage.camera;

  // Add to RTT queue at specified order.
  this.queue = ThreeRTT.RenderQueue.bind(world);
  this.queue.add(this);

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

  // Change the autoscale factor
  scale: function (scale) {
    if (scale) {
      this._options.scale = scale;

      if (this._options.autoSize) {
        // Resize immediately based off parent scale.
        var opts = this._world._opts,
            width = opts.renderW / scale,
            height = opts.renderH / scale;

        this.size(width, height);
      }

      return this;
    }

    return this._options.scale;
  },

  // Resize the RTT texture.
  size: function (width, height, ignore) {
    if (width && height) {
      this._options.width = width;
      this._options.height = height;

      // Compatibility with tQuery world
      this._opts = {
        renderW: width,
        renderH: height//,
      };

      // Ignore on init.
      ignore || this._stage.size(width, height);
      return this;
    }

    return { width: this._options.width, height: this._options.height };
  },

  // Set/remove the default full-screen quad surface material
  material: function (material) {
    this._stage.material(material);
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

  	// Render the scene 
  	if (this._autoRendering) {
      // Render to write target.
  	  this._stage.render();
	  }

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
tQuery.World.register('rtt', function (options) {
  return tQuery.createRTT(this, options);
});

/**
 * Add a surface showing a render-to-texture surface to this world.
 */
tQuery.World.register('compose', function (rtts, fragmentShader, textures, uniforms) {
  tQuery.composeRTT(this, rtts, fragmentShader, textures, uniforms);
  return this;
});

/**
 * Apply a fragment material to this RTT world.
 */
ThreeRTT.World.register('fragment', function (fragmentShader, textures, uniforms) {
  this.material(tQuery.createFragmentMaterial(this, fragmentShader, textures, uniforms));
  return this;
});

/**
 * Apply a raytrace material to this RTT world.
 */
ThreeRTT.World.register('raytrace', function (fragmentShader, textures, uniforms) {
  this.material(tQuery.createRaytraceMaterial(this, fragmentShader, textures, uniforms));
  return this;
});

/**
 * Apply a downsample material to this RTT world, sampling from the given world.
 */
ThreeRTT.World.register('downsample', function (worldFrom) {
  // Force this world to right scale (will autosize)
  var scale = worldFrom.scale();
  this.scale(scale * 2);

  // Force this world to right size now if not autosizing
  if (!worldFrom.autoSize) {
    var size = worldFrom.size();
    this.size(size.width / 2, size.height / 2);
  }

  this.material(tQuery.createDownsampleMaterial(worldFrom, this));
  return this;
});

/**
 * Create a render-to-texture world (static).
 */
tQuery.register('createRTT', function (world, options) {
  // Create new RTT world.
  return new ThreeRTT.World(world, options);
});

/**
 * Create a surface showing a render-to-texture image in this world.
 */
tQuery.register('composeRTT', function (world, rtts, fragmentShader, textures, uniforms) {
  return new ThreeRTT.Compose(world.tScene(), rtts, fragmentShader, textures, uniforms);
});

/**
 * Create a FragmentMaterial.
 */
tQuery.register('createFragmentMaterial', function (worlds, fragmentShader, textures, uniforms) {
  return new ThreeRTT.FragmentMaterial(worlds, fragmentShader, textures, uniforms);
});

/**
 * Create a RaytraceMaterial.
 */
tQuery.register('createRaytraceMaterial', function (world, fragmentShader, textures, uniforms) {
  return new ThreeRTT.RaytraceMaterial(world, fragmentShader, textures, uniforms);
});

/**
 * Create a DownsampleMaterial.
 */
tQuery.register('createDownsampleMaterial', function (worldFrom, worldTo) {
  return new ThreeRTT.DownsampleMaterial(worldFrom, worldTo);
});
