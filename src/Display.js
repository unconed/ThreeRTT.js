/**
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

});