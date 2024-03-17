#include "curl/curl.h"

typedef void(*DataCallback)(char* chunk_ptr, int chunk_size);
typedef void(*EndCallback)(int error);

struct RequestInfo {
  CURL* http_handle;
  struct CURLMsg *curl_msg;
  struct curl_slist* headers_list;
  DataCallback data_callback;
  DataCallback headers_callback;
  EndCallback end_callback;
};

struct WSResult {
  int res;
  int buffer_size;
  int closed;
  int bytes_left;
  int is_text;
  char* buffer;
};

struct SessionInfo {
  CURLM* multi_handle;
  int request_active;
};