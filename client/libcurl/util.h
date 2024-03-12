#include "curl/curl.h"

int starts_with(const char *a, const char *b);

struct RequestInfo* get_handle_info(CURL* http_handle);