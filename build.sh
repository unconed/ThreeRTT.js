#!/bin/bash
VENDOR="
vendor/microevent.js
"

SRC="
src/Common.js
src/Stage.js
src/Compose.js
src/Camera.js
src/RenderTarget.js
src/ScreenGeometry.js
src/FragmentMaterial.js
src/DownsampleMaterial.js
src/RaytraceMaterial.js
"

TQUERY="
src/tQuery/World.js
src/tQuery/RenderQueue.js
src/tQuery/tQuery.js
"

SHADERS="
shaders/shaders.glsl.html
"

cat $VENDOR $SRC > build/ThreeRTT.js
cat $VENDOR $SRC $TQUERY > build/ThreeRTT-tquery.js
cat $SHADERS > build/shaders.glsl.html

curl --data-urlencode "js_code@build/ThreeRTT.js" 	\
	-d "output_format=text&output_info=compiled_code&compilation_level=SIMPLE_OPTIMIZATIONS" \
	http://closure-compiler.appspot.com/compile	\
	> build/ThreeRTT.min.js

curl --data-urlencode "js_code@build/ThreeRTT-tquery.js" 	\
	-d "output_format=text&output_info=compiled_code&compilation_level=SIMPLE_OPTIMIZATIONS" \
	http://closure-compiler.appspot.com/compile	\
	> build/ThreeRTT-tquery.min.js
