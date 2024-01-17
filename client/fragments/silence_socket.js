/* DELETE
err\("__syscall_getsockname " ?\+ ?fd\);
*/


/* INSERT
function _emscripten_console_error\(str\) {
*/
if (UTF8ToString(str).endsWith("__syscall_setsockopt\\n")) return;