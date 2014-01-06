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
