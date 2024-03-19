#include <stdlib.h>

#include "curl/curl.h"
#include "curl/easy.h"
#include "types.h"

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