/**
 * Virtual render target for complex render-to-texture usage.
 *
 * Contains multiple buffers for rendering from/to itself transparently
 * and/or remembering multiple frames of history.
 * 
 * Set options.buffers to the number of frames needed (default 2).
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
    clear:         { color: true, depth: true, stencil: true },
    clearColor:    0xFFFFFF,
    clearAlpha:    0,
    buffers:       2,
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

  // Set size and allocate render targets.
  this.size(options.width, options.height);
},

ThreeRTT.RenderTarget.prototype = {

  // Retrieve virtual target for reading from, n frames back.
  read: function (n) {
    // Clamp history to available buffers minus write buffer.
    n = Math.min(this.options.buffers - 2, Math.abs(n || 0));
    return this.virtuals[n];
  },

  // Retrieve virtual render target for writing/rendering to.
  write: function () {
    // Write buffer is the last virtual buffer.
    return this.virtuals[this.options.buffers - 1];
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

    // Allocate/Refresh real render targets
    var targets = this.targets = [];
    _.loop(options.buffers, function () {

      targets.push(new THREE.WebGLRenderTarget(
        options.width,
        options.height,
        options.texture
      ));
    });
  },

  // Prepare virtual render targets for reading/writing.
  allocateVirtuals: function () {
    var original = this.targets[0],
        virtuals  = this.virtuals || [];
        n = options.buffers;

    // Keep virtual targets around if possible.
    if (n > virtuals.length)
      _.loop(n - virtuals.length, function () {
        virtual.push(original.clone());
      }.bind(this));
    }
    else {
      virtuals = virtuals.slice(0, n);
    }

    // Set sizes of virtual render targets.
    _.each(virtual, function (target) {
      target.width = width;
      target.height = height;
    });

    this.virtuals = virtuals;

    // Reset index.
    this.index = 0;
  }

  // Advance through buffers.
  advance: function () {
    var options  = this.options,
        targets  = this.targets,
        virtuals = this.virtuals,
        index    = this.index,
        n        = options.buffers;

    // Point virtual render targets to new targets.
    _.loop(options.buffers, function (i) {
      var dst = virtuals[(i + index) % n],
          src = targets[i];

      dst.__webglTexture      = src.__webglTexture;
      dst.__webglFramebuffer  = src.__webglFramebuffer;
      dst.__webglRenderbuffer = src.__webglRenderbuffer;
    });

    // Advance cyclic index.
    this.index = (index + 1) % n;
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

    // Render scene.
    this.renderer.render(scene, camera, this.write());

    // Restore autoclear to previous state.
    this.renderer.autoClear = autoClear;

    // Advance render buffers so newly rendered frame is at .read(0).
    this.options.autoAdvance && this.advance();
  },

};

// Microeventable
MicroEvent.mixin(ThreeRTT.RenderTarget);
