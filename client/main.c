#include <stdlib.h>
#include <stdio.h>
#include <curl/curl.h>
#include <emscripten.h>
#include <string.h>

int write_function(void *data, size_t size, size_t nmemb, void(*data_callback)(char* chunk_ptr, int chunk_size)) {
  long real_size = size * nmemb;
  char* chunk = malloc(real_size);
  memcpy(chunk, data, real_size);
  data_callback(chunk, real_size);
  free(chunk);
  return real_size;
}
 
void perform_request(const char* url, void(*data_callback)(char* chunk_ptr, int chunk_size), void(*end_callback)()) {
  printf("downloading %s\n", url);

  CURL *http_handle;
  CURLM *multi_handle;
  int still_running = 1;
 
  curl_global_init(CURL_GLOBAL_DEFAULT);
  http_handle = curl_easy_init();
 
  curl_easy_setopt(http_handle, CURLOPT_URL, url);
  curl_easy_setopt(http_handle, CURLOPT_PROXY, "socks5h://127.0.0.1:1234");
  curl_easy_setopt(http_handle, CURLOPT_PROXYTYPE, CURLPROXY_SOCKS5);
  curl_easy_setopt(http_handle, CURLOPT_CAINFO, "/cacert.pem");
  curl_easy_setopt(http_handle, CURLOPT_CAPATH, "/cacert.pem");

  //callbacks to pass the response data back to js
  curl_easy_setopt(http_handle, CURLOPT_WRITEFUNCTION, &write_function);
  curl_easy_setopt(http_handle, CURLOPT_WRITEDATA, data_callback);
  
 
  multi_handle = curl_multi_init();
  curl_multi_add_handle(multi_handle, http_handle);
 
  do {
    CURLMcode mc = curl_multi_perform(multi_handle, &still_running);
 
    if(!mc)
      mc = curl_multi_poll(multi_handle, NULL, 0, 1000, NULL);
 
    if(mc) {
      fprintf(stderr, "curl_multi_poll() failed, code %d.\n", (int)mc);
      break;
    }

    //ensure we dont block the main thread
    emscripten_sleep(0);
 
  } while(still_running);
 
  curl_multi_remove_handle(multi_handle, http_handle);
  curl_easy_cleanup(http_handle);
  curl_multi_cleanup(multi_handle);
  curl_global_cleanup();

  (*end_callback)();
}

char* copy_bytes(const char* ptr, const int size) {
  char* new_ptr = malloc(size);
  memcpy(new_ptr, ptr, size);
  return new_ptr;
}

int main() {
  printf("emscripten libcurl module loaded\n");
}