#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <emscripten.h>

#include "curl/curl.h"
#include "curl/easy.h"
#include "curl/header.h"
#include "cjson/cJSON.h"
#include "cacert.h"

typedef void(*DataCallback)(char* chunk_ptr, int chunk_size);
typedef void(*EndCallback)(int error, char* response_json);

#define ERROR_REDIRECT_DISALLOWED -1

int write_function(void *data, size_t size, size_t nmemb, DataCallback data_callback) {
  long real_size = size * nmemb;
  char* chunk = malloc(real_size);
  memcpy(chunk, data, real_size);
  data_callback(chunk, real_size);
  free(chunk);
  return real_size;
}

void perform_request(const char* url, const char* json_params, DataCallback data_callback, EndCallback end_callback, const char* body, int body_length) {
  CURL *http_handle;
  CURLM *multi_handle;
  int still_running = 1;
  int abort_on_redirect = 0;
 
  curl_global_init(CURL_GLOBAL_DEFAULT);
  http_handle = curl_easy_init();
 
  curl_easy_setopt(http_handle, CURLOPT_URL, url);
  curl_easy_setopt(http_handle, CURLOPT_CAINFO, "/cacert.pem");
  curl_easy_setopt(http_handle, CURLOPT_CAPATH, "/cacert.pem");

  //callbacks to pass the response data back to js
  curl_easy_setopt(http_handle, CURLOPT_WRITEFUNCTION, &write_function);
  curl_easy_setopt(http_handle, CURLOPT_WRITEDATA, data_callback);

  //some default options
  curl_easy_setopt(http_handle, CURLOPT_FOLLOWLOCATION, 1);
  curl_easy_setopt(http_handle, CURLOPT_ACCEPT_ENCODING, "");

  //parse json options
  cJSON* request_json = cJSON_Parse(json_params);
  cJSON* item = NULL;
  struct curl_slist* headers_list = NULL;

  cJSON_ArrayForEach(item, request_json) {
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
    }
  }
  cJSON_Delete(request_json);
  
  //add post data if specified
  if (body != NULL) {
    curl_easy_setopt(http_handle, CURLOPT_POSTFIELDS, body);
    curl_easy_setopt(http_handle, CURLOPT_POSTFIELDSIZE, body_length);
  }
  
  multi_handle = curl_multi_init();
  curl_multi_add_handle(multi_handle, http_handle);
  
  CURLMcode mc;
  struct CURLMsg *m;
  do {
    mc = curl_multi_perform(multi_handle, &still_running);
 
    if(!mc)
      mc = curl_multi_poll(multi_handle, NULL, 0, 1000, NULL);
 
    if(mc) {
      fprintf(stderr, "curl_multi_poll() failed, code %d.\n", (int)mc);
      break;
    }

    int msgq = 0;
    m = curl_multi_info_read(multi_handle, &msgq);

    //ensure we dont block the main thread
    emscripten_sleep(0);
 
  } while(still_running);
  
  int error = (int) m->data.result;
  long response_code;
  curl_easy_getinfo(http_handle, CURLINFO_RESPONSE_CODE, &response_code);

  if (abort_on_redirect && response_code / 100 == 3) {
    error = ERROR_REDIRECT_DISALLOWED;
  }

  //create new json object with response info
  cJSON* response_json = cJSON_CreateObject();

  cJSON* status_item = cJSON_CreateNumber(response_code);
  cJSON_AddItemToObject(response_json, "status", status_item);

  char* response_url;
  curl_easy_getinfo(http_handle, CURLINFO_EFFECTIVE_URL, &response_url);
  cJSON* url_item = cJSON_CreateString(response_url);
  cJSON_AddItemToObject(response_json, "url", url_item);

  cJSON* headers_item = cJSON_CreateObject();
  struct curl_header *prev_header = NULL;
  struct curl_header *header = NULL;
  while ((header = curl_easy_nextheader(http_handle, CURLH_HEADER, -1, prev_header))) {
    cJSON* header_entry = cJSON_CreateString(header->value);
    cJSON_AddItemToObject(headers_item, header->name, header_entry);
    prev_header = header;
  }
  cJSON_AddItemToObject(response_json, "headers", headers_item);

  long redirect_count;
  curl_easy_getinfo(http_handle, CURLINFO_REDIRECT_COUNT, &redirect_count);
  cJSON* redirects_item = cJSON_CreateBool(redirect_count > 0);
  cJSON_AddItemToObject(response_json, "redirected", redirects_item);

  char* response_json_str = cJSON_Print(response_json);
  cJSON_Delete(response_json);
  
  //clean up curl
  curl_slist_free_all(headers_list);
  curl_multi_remove_handle(multi_handle, http_handle);
  curl_easy_cleanup(http_handle);
  curl_multi_cleanup(multi_handle);
  curl_global_cleanup();

  (*end_callback)(error, response_json_str);
}

char* copy_bytes(const char* ptr, const int size) {
  char* new_ptr = malloc(size);
  memcpy(new_ptr, ptr, size);
  return new_ptr;
}

void load_certs() {
  FILE *file = fopen("/cacert.pem", "wb");
  fwrite(_cacert_pem, 1, _cacert_pem_len, file);
  fclose(file);
}