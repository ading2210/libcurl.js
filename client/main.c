#include <stdlib.h>
#include <stdio.h>
#include <emscripten.h>
#include <string.h>

#include "curl/curl.h"
#include "cjson/cJSON.h"
#include "errors.h"

typedef void(*DataCallback)(char* chunk_ptr, int chunk_size);
typedef void(*EndCallback)(int error);

int write_function(void *data, size_t size, size_t nmemb, DataCallback data_callback) {
  long real_size = size * nmemb;
  char* chunk = malloc(real_size);
  memcpy(chunk, data, real_size);
  data_callback(chunk, real_size);
  free(chunk);
  return real_size;
}

void perform_request(const char* url, const char* json_params, DataCallback data_callback, EndCallback end_callback, const char* body, int body_length) {
  printf("downloading %s\n", url);

  CURL *http_handle;
  CURLM *multi_handle;
  int still_running = 1;
  int abort_on_redirect = 0;
 
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

  //parse json options
  cJSON* json = cJSON_Parse(json_params);
  cJSON* item = NULL;
  struct curl_slist* headers_list = NULL;

  cJSON_ArrayForEach(item, json) {
    char* key = item->string;

    if (strcmp(key, "_libcurl_verbose") == 0) {
      curl_easy_setopt(http_handle, CURLOPT_VERBOSE, 1L);
    }

    if (strcmp(key, "method") == 0 && cJSON_IsString(item)) {
      curl_easy_setopt(http_handle, CURLOPT_CUSTOMREQUEST, item->valuestring);
    }
    
    if (strcmp(key, "headers") == 0 && cJSON_IsObject(item)) {
      cJSON* header = NULL;

      cJSON_ArrayForEach(header, item) {
        if (!cJSON_IsString(header)) continue;
        int header_length = strlen(header->string) + strlen(header->valuestring) + 2;
        char* header_str = malloc(header_length+1);
        header_str[header_length] = 0;

        sprintf(header_str, "%s: %s", header->string, header->valuestring);
        headers_list = curl_slist_append(headers_list, header_str);
        free(header_str);
      }

      curl_easy_setopt(http_handle, CURLOPT_HTTPHEADER, headers_list);
    }

    if (strcmp(key, "redirect") == 0 && cJSON_IsString(item)) {
      if (strcmp(item->valuestring, "error") == 0) {
        abort_on_redirect = 1;
        curl_easy_setopt(http_handle, CURLOPT_FOLLOWLOCATION, 0);
      }
      else if (strcmp(item->valuestring, "manual") == 0) {
        curl_easy_setopt(http_handle, CURLOPT_FOLLOWLOCATION, 0);
      }
      else { 
        //follow by default
        curl_easy_setopt(http_handle, CURLOPT_FOLLOWLOCATION, 1);
      }
    }
  }
  cJSON_Delete(json);
  
  //add post data if specified
  if (body != NULL) {
    curl_easy_setopt(http_handle, CURLOPT_POSTFIELDS, body);
    curl_easy_setopt(http_handle, CURLOPT_POSTFIELDSIZE, body_length);
  }
  
  multi_handle = curl_multi_init();
  curl_multi_add_handle(multi_handle, http_handle);
  
  CURLMcode mc;
  do {
    mc = curl_multi_perform(multi_handle, &still_running);
 
    if(!mc)
      mc = curl_multi_poll(multi_handle, NULL, 0, 1000, NULL);
 
    if(mc) {
      fprintf(stderr, "curl_multi_poll() failed, code %d.\n", (int)mc);
      break;
    }

    //ensure we dont block the main thread
    emscripten_sleep(0);
 
  } while(still_running);
  
  int error = (int) mc;
  long response_code;
  curl_easy_getinfo(http_handle, CURLINFO_RESPONSE_CODE, &response_code);

  if (abort_on_redirect && response_code / 100 == 3) {
    error = ERROR_REDIRECT_DISALLOWED;
  }
  
  curl_slist_free_all(headers_list);
  curl_multi_remove_handle(multi_handle, http_handle);
  curl_easy_cleanup(http_handle);
  curl_multi_cleanup(multi_handle);
  curl_global_cleanup();

  (*end_callback)(error);
}

char* copy_bytes(const char* ptr, const int size) {
  char* new_ptr = malloc(size);
  memcpy(new_ptr, ptr, size);
  return new_ptr;
}

int main() {
  printf("emscripten libcurl module loaded\n");
}