/**
 * Priority queue for render-to-texture stages (tQuery).
 *
 * Attach a weighted queue to the given world, rendered before the world itself.
 */
ThreeRTT.RenderQueue = function (world) {
  // Singleton attached to world.
  if (world.__renderQueue) {
    return world.__renderQueue;
  }
  if (this == window) return new ThreeRTT.RenderQueue(world);

  world.__renderQueue = this;

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
      world.loop().hookOnPreRender(this.callback = function () {
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
      world.loop().unhookOnPreRender(this.callback);
      this.callback = null;
    }
  },

  // Sort queue by given order.
  sort: function () {
    this.queue.sort(function (a, b) {
      return a.order - b.order;
    })
  }//,
};
