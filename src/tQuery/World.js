/**
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
    scale:         1,
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
  },
});

// Make it pluginable.
tQuery.pluginsInstanceOn(ThreeRTT.World);

// Make it eventable.
tQuery.MicroeventMixin(ThreeRTT.World.prototype)
