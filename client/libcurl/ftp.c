#include "curl/curl.h"

#include "types.h"
#include "util.h"

void ftp_set_options(CURL* http_handle, const char* url, int no_body) {
  curl_easy_setopt(http_handle, CURLOPT_NOBODY, (long) no_body);
  curl_easy_setopt(http_handle, CURLOPT_URL, url);
}