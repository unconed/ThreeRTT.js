Changes
-------

Dec 14, 2012

* Added `.display()` tquery world method to insert a Display object.
* Changed `ThreeRTT.Compose` to be an Object3D subclass.
* Added `.paint()` stage pass to render objects on top of the current frame buffer.

Dec 12, 2012

* RenderTargets no longer clear themselves by default. Specify `clear: { color: true, depth: true, stencil: true }` to override.
* FragmentMaterials now ignore the depth buffer by default.
* Stages can now contain multiple rendering passes, and there is an .iterate(n, ...) function to add iterated passes. This is useful for e.g. fluid dynamics. Calling `stage.fragment('init').iterate(10, 'loop')` will first render one pass of 'init' followed by 10 iterations of 'loop'. Call `.reset()` to remove all passes from a stage.