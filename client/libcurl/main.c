#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <emscripten.h>

#include "curl/curl.h"
#include "curl/easy.h"
#include "curl/header.h"
#include "cjson/cJSON.h"
#include "cacert.h"
#include "curl/multi.h"

#include "util.h"
#include "types.h"

void finish_request(CURLMsg *curl_msg);

#define ERROR_REDIRECT_DISALLOWED -1

CURLM *multi_handle;
int request_active = 0;

int write_function(void *data, size_t size, size_t nmemb, DataCallback data_callback) {
  long real_size = size * nmemb;
  char* chunk = malloc(real_size);
  memcpy(chunk, data, real_size);
  data_callback(chunk, real_size);
  free(chunk);
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

CURL* start_request(const char* url, const char* json_params, DataCallback data_callback, EndCallback end_callback, const char* body, int body_length) {
  CURL *http_handle = curl_easy_init();  
  int abort_on_redirect = 0;
  int prevent_cleanup = 0;
 
  curl_easy_setopt(http_handle, CURLOPT_URL, url);
  curl_easy_setopt(http_handle, CURLOPT_CAINFO, "/cacert.pem");
  curl_easy_setopt(http_handle, CURLOPT_CAPATH, "/cacert.pem");

  //callbacks to pass the response data back to js
  curl_easy_setopt(http_handle, CURLOPT_WRITEFUNCTION, &write_function);
  curl_easy_setopt(http_handle, CURLOPT_WRITEDATA, data_callback);

  //some default options
  curl_easy_setopt(http_handle, CURLOPT_FOLLOWLOCATION, 1);
  curl_easy_setopt(http_handle, CURLOPT_ACCEPT_ENCODING, "");
  curl_easy_setopt(http_handle, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2_0);

  //if url is a websocket, tell curl that we should handle the connection manually
  if (starts_with(url, "wss://") || starts_with(url, "ws://")) {
    curl_easy_setopt(http_handle, CURLOPT_CONNECT_ONLY, 2L);
    prevent_cleanup = 1;
  }

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

  struct RequestInfo *request_info = malloc(sizeof(struct RequestInfo));
  request_info->abort_on_redirect = abort_on_redirect;
  request_info->curl_msg = NULL;
  request_info->headers_list = headers_list;
  request_info->end_callback = end_callback;
  request_info->prevent_cleanup = prevent_cleanup;
  curl_easy_setopt(http_handle, CURLOPT_PRIVATE, request_info);
  
  curl_multi_add_handle(multi_handle, http_handle);

  return http_handle;
}

void finish_request(CURLMsg *curl_msg) {
  //get initial request info from the http handle
  struct RequestInfo *request_info;
  CURL *http_handle = curl_msg->easy_handle;
  curl_easy_getinfo(http_handle, CURLINFO_PRIVATE, &request_info);

  int error = (int) curl_msg->data.result;
  long response_code;
  curl_easy_getinfo(http_handle, CURLINFO_RESPONSE_CODE, &response_code);

  if (request_info->abort_on_redirect && response_code / 100 == 3) {
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
  curl_slist_free_all(request_info->headers_list);
  (*request_info->end_callback)(error, response_json_str);
  if (request_info->prevent_cleanup) {
    return;
  }
  curl_multi_remove_handle(multi_handle, http_handle);
  curl_easy_cleanup(http_handle);
  free(request_info);
}

void init_curl() {
  curl_global_init(CURL_GLOBAL_DEFAULT);
  multi_handle = curl_multi_init();
  
  FILE* file = fopen("/cacert.pem", "wb");
  fwrite(_cacert_pem, 1, _cacert_pem_len, file);
  fclose(file);
}