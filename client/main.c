#include "emscripten/emscripten.h"
#include <stdio.h>
#include <curl/curl.h>
#include <emscripten.h>
 
int do_request(const char* url) {
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
 
  return 0;
}

int main() {
  printf("emscripten libcurl module loaded\n");
  do_request("https://ifconfig.me/all");
}