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

CURLM *multi_handle;
int request_active = 0;
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

int active_requests() {
  return request_active;
}

void tick_request() {
  CURLMcode mc;
  struct CURLMsg *curl_msg;
  request_active = 1;
  
  mc = curl_multi_perform(multi_handle, &request_active);

  int msgq = 0;
  curl_msg = curl_multi_info_read(multi_handle, &msgq);
  if (curl_msg && curl_msg->msg == CURLMSG_DONE) {
    finish_request(curl_msg);
  }
}

CURL* create_handle(const char* url, DataCallback data_callback, EndCallback end_callback, HeadersCallback headers_callback) {
  CURL *http_handle = curl_easy_init();  

  //create request metadata struct
  struct RequestInfo *request_info = malloc(sizeof(struct RequestInfo));
  request_info->http_handle = http_handle;
  request_info->curl_msg = NULL;
  request_info->prevent_cleanup = 0;
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

void start_request(CURL* http_handle) {
  curl_multi_add_handle(multi_handle, http_handle);
}

void forward_headers(struct RequestInfo *request_info) {
  request_info->headers_received = 1;
  (*request_info->headers_callback)();
}

void finish_request(CURLMsg *curl_msg) {
  CURL *http_handle = curl_msg->easy_handle;
  struct RequestInfo *request_info = get_handle_info(http_handle);

  int error = (int) curl_msg->data.result;
  if (!request_info->headers_received && error == 0) {
    forward_headers(request_info);
  }

  //clean up curl
  curl_slist_free_all(request_info->headers_list);
  (*request_info->end_callback)(error);
  if (request_info->prevent_cleanup) {
    return;
  }
  curl_multi_remove_handle(multi_handle, http_handle);
  curl_easy_cleanup(http_handle);
  free(request_info);
}

void cleanup_handle(CURL* http_handle) {
  struct RequestInfo *request_info = get_handle_info(http_handle);
  curl_multi_remove_handle(multi_handle, http_handle);
  curl_easy_cleanup(http_handle);
  free(request_info);
}

unsigned char* get_cacert() {
  return _cacert_pem;
}

void init_curl() {
  curl_global_init(CURL_GLOBAL_DEFAULT);
  multi_handle = curl_multi_init();

  //emscripten has a fairly low file descriptor limit which means
  //we must limit the total number of active tcp connections
  curl_multi_setopt(multi_handle, CURLMOPT_MAX_TOTAL_CONNECTIONS, 50L);
  curl_multi_setopt(multi_handle, CURLMOPT_MAXCONNECTS, 40L);
  
  cacert_blob.data = _cacert_pem;
  cacert_blob.len = _cacert_pem_len;
  cacert_blob.flags = CURL_BLOB_NOCOPY;
}