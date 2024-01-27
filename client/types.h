typedef void(*DataCallback)(char* chunk_ptr, int chunk_size);
typedef void(*EndCallback)(int error, char* response_json);

struct RequestInfo {
  int abort_on_redirect;
  int prevent_cleanup;
  struct CURLMsg *curl_msg;
  struct curl_slist* headers_list;
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