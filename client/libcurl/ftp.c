#include "curl/curl.h"

#include "types.h"
#include "util.h"

void ftp_set_options(CURL* easy_handle) {
  curl_easy_setopt(easy_handle, CURLOPT_VERBOSE, 1L);
}

void ftp_set_cmd(CURL* easy_handle, const char* cmd) {
  struct curl_slist *cmd_list = NULL;
  cmd_list = curl_slist_append(cmd_list, cmd);
  
  curl_easy_setopt(easy_handle, CURLOPT_QUOTE, cmd_list);
  curl_easy_setopt(easy_handle, CURLOPT_NOBODY, 1L);

  curl_slist_free_all(cmd_list);
}