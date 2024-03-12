#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "curl/curl.h"
#include "cjson/cJSON.h"

int starts_with(const char *a, const char *b) {
  return strncmp(a, b, strlen(b)) == 0;
}

char* get_version() {
  struct curl_version_info_data *version_info = curl_version_info(CURLVERSION_NOW);
  cJSON* version_json = cJSON_CreateObject();

  cJSON* protocols_array = cJSON_CreateArray();
  const char *const *protocols = version_info->protocols;
  for (; *protocols != NULL; protocols++) {
    cJSON* protocol_item = cJSON_CreateString(*protocols);
    cJSON_AddItemToArray(protocols_array, protocol_item);
  }
  
  cJSON* curl_version_item = cJSON_CreateString(version_info->version);
  cJSON* ssl_version_item = cJSON_CreateString(version_info->ssl_version);
  cJSON* brotli_version_item = cJSON_CreateString(version_info->brotli_version);
  cJSON* nghttp2_version_item = cJSON_CreateString(version_info->nghttp2_version);
  
  cJSON_AddItemToObject(version_json, "curl", curl_version_item);
  cJSON_AddItemToObject(version_json, "ssl", ssl_version_item);
  cJSON_AddItemToObject(version_json, "brotli", brotli_version_item);
  cJSON_AddItemToObject(version_json, "nghttp2", nghttp2_version_item);
  cJSON_AddItemToObject(version_json, "protocols", protocols_array);

  char* version_json_str = cJSON_Print(version_json);
  cJSON_Delete(version_json);
  return version_json_str;
}

const char* get_error_str(CURLcode error_code) {
  return curl_easy_strerror(error_code);
}

struct RequestInfo *get_request_info(CURL* http_handle) {
  struct RequestInfo *request_info;
  curl_easy_getinfo(http_handle, CURLINFO_PRIVATE, &request_info);
  return request_info;
}