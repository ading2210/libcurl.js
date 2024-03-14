#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <emscripten.h>

#include "curl/curl.h"
#include "curl/easy.h"
#include "curl/multi.h"

#include "cacert.h"
#include "util.h"
#include "types.h"

void finish_request(CURLMsg *curl_msg);
void forward_headers(struct RequestInfo *request_info);

struct curl_blob cacert_blob;

size_t write_function(char *data, size_t size, size_t nmemb, struct RequestInfo *request_info) {
  //this should be in the write callback rather than curl's header callback because
  //the write function will only be called after redirects
  if (!request_info->headers_received) {
    forward_headers(request_info);
  }

  size_t real_size = size * nmemb;
  (*request_info->data_callback)(data, real_size);
  return real_size;
}

CURL* create_request(const char* url, DataCallback data_callback, EndCallback end_callback, HeadersCallback headers_callback) {
  CURL *http_handle = curl_easy_init();  

  //create request metadata struct
  struct RequestInfo *request_info = malloc(sizeof(struct RequestInfo));
  request_info->http_handle = http_handle;
  request_info->curl_msg = NULL;
  request_info->headers_list = NULL;
  request_info->headers_received = 0;
  request_info->end_callback = end_callback;
  request_info->data_callback = data_callback;
  request_info->headers_callback = headers_callback;

  curl_easy_setopt(http_handle, CURLOPT_PRIVATE, request_info);
  curl_easy_setopt(http_handle, CURLOPT_URL, url);
  curl_easy_setopt(http_handle, CURLOPT_CAINFO_BLOB , cacert_blob);

  //callbacks to pass the response data back to js
  curl_easy_setopt(http_handle, CURLOPT_WRITEFUNCTION, &write_function);
  curl_easy_setopt(http_handle, CURLOPT_WRITEDATA, request_info);
  
  return http_handle;
}

void forward_headers(struct RequestInfo *request_info) {
  request_info->headers_received = 1;
  (*request_info->headers_callback)();
}

void finish_request(CURLMsg *curl_msg) {
  CURL *http_handle = curl_msg->easy_handle;
  struct RequestInfo *request_info = get_request_info(http_handle);

  int error = (int) curl_msg->data.result;
  if (!request_info->headers_received && error == 0) {
    forward_headers(request_info);
  }

  //clean up curl
  if (request_info->headers_list != NULL) {
    curl_slist_free_all(request_info->headers_list);
  }
  (*request_info->end_callback)(error);
}

unsigned char* get_cacert() {
  return _cacert_pem;
}

void init_curl() {
  curl_global_init(CURL_GLOBAL_DEFAULT);
  cacert_blob.data = _cacert_pem;
  cacert_blob.len = _cacert_pem_len;
  cacert_blob.flags = CURL_BLOB_NOCOPY;
}