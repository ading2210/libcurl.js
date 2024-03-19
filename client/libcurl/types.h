#include "curl/curl.h"

typedef void(*DataCallback)(char* chunk_ptr, int chunk_size);
typedef void(*EndCallback)(int error);
typedef void(*HeadersCallback)(char* response_json);

struct RequestInfo {
  CURL* http_handle;
  int abort_on_redirect;
  int prevent_cleanup;
  int headers_received;
  struct CURLMsg *curl_msg;
  struct curl_slist* headers_list;
  DataCallback data_callback;
  EndCallback end_callback;
  HeadersCallback headers_callback;
};

struct WSResult {
  int res;
  int buffer_size;
  int closed;
  int bytes_left;
  int is_text;
  char* buffer;
};