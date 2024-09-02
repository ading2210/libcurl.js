/* INSERT
var ?opts ?= ?undefined;
*/
var parts = addr.split("/");
if (!url.endsWith("/")) url += "/";
url += parts[0] + ":" + port;