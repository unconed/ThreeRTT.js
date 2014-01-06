Changes
-------

Jan 5 2014
* The crappy RaytraceMaterial was rewritten. The uniforms are different, and the ray set up is simpler. See test/raytrace.html for an example.
* Visibility of objects passed to .paint() is now respected.

Dec 18, 2012
* .compose() and .display() return their component objects to allow further manipulation.

Dec 14, 2012

* Added `.display()` tquery world method to insert a Display object.
* Changed `ThreeRTT.Compose` to be an Object3D subclass.
* Added `.paint()` stage pass to render objects on top of the current frame buffer.

Dec 12, 2012

* RenderTargets no longer clear themselves by default. Specify `clear: { color: true, depth: true, stencil: true }` to override.
* FragmentMaterials now ignore the depth buffer by default.
* Stages can now contain multiple rendering passes, and there is an .iterate(n, ...) function to add iterated passes. This is useful for e.g. fluid dynamics. Calling `stage.fragment('init').iterate(10, 'loop')` will first render one pass of 'init' followed by 10 iterations of 'loop'. Call `.reset()` to remove all passes from a stage.
