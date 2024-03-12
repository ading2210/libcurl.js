#include <stdlib.h>

#include "curl/curl.h"
#include "curl/easy.h"

#include "types.h"
#include "util.h"

struct WSResult* recv_from_socket(CURL* http_handle, int buffer_size) {
  size_t nread;
  char* buffer = malloc(buffer_size);
  CURLcode res = curl_easy_recv(http_handle, buffer, buffer_size, &nread);
  
  struct WSResult* result = malloc(sizeof(struct WSResult));
  result->buffer_size = nread;
  result->buffer = buffer;
  result->res = (int) res;
  result->closed = (nread == 0);
  return result;
}

int send_to_socket(CURL* http_handle, const char* data, int data_len) {
  size_t sent;
  CURLcode res = curl_easy_send(http_handle, data, data_len, &sent);
  return (int) res;
}

void tls_socket_set_options(CURL* http_handle, int verbose) {
  struct RequestInfo *request_info = get_request_info(http_handle);
  curl_easy_setopt(http_handle, CURLOPT_CONNECT_ONLY, 1L);
  curl_easy_setopt(http_handle, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);
  curl_easy_setopt(http_handle, CURLOPT_SSL_ENABLE_ALPN, 0L);
  curl_easy_setopt(http_handle, CURLOPT_VERBOSE, (long) verbose);
  request_info->prevent_cleanup = 1;
}
