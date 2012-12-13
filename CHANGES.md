Changes
-------

Dec 12, 2012

* RenderTargets no longer clear themselves by default. Specify `clear: { color: true, depth: true, stencil: true }` to override. FragmentMaterials now ignore the depth buffer by default.

* Stages can now contain multiple rendering passes, and there is an .iterate() function to add iterated passes. This is useful for e.g. fluid dynamics. Calling `stage.fragment('init').iterate(10, 'loop')` will first render one pass of 'init' followed by 10 iterations of 'loop'. Call `.reset()` to remove all passes from a stage.