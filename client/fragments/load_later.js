/* REPLACE
var asm ?= ?createWasm\(\);
*/
if (wasmBinaryFile && isDataURI(wasmBinaryFile)) var asm = createWasm();
else var asm = null;

/* REPLACE
var wasmExports ?= ?createWasm\(\);
*/
if (wasmBinaryFile && isDataURI(wasmBinaryFile)) var wasmExports = createWasm();
else var wasmExports = null;

/* REPLACE
run\(\);\n\n
*/
if (wasmBinaryFile && isDataURI(wasmBinaryFile)) run();