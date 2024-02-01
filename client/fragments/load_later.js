/* REPLACE
var asm ?= ?createWasm\(\);
*/
if (isDataURI(wasmBinaryFile)) var asm = createWasm();
else var asm = null;

/* REPLACE
var wasmExports ?= ?createWasm\(\);
*/
if (isDataURI(wasmBinaryFile)) var wasmExports = createWasm();
else var wasmExports = null;

/* REPLACE
run\(\);\n\n
*/
if (isDataURI(wasmBinaryFile)) run();