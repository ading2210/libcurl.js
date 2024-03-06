function logger(type, text) {
  if (type === "log")
    console.log(text);
  else if (type === "warn") 
    console.warn(text);
  else if (type === "error")
    console.error(text);
}

function log_msg(text) {
  logger("log", text);
}
function warn_msg(text) {
  logger("warn", text);
}
function error_msg(text) {
  logger("error", text);
}
