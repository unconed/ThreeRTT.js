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
