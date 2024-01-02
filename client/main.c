#include <stdio.h>
#include <curl/curl.h>
 
int main() {
  CURL *curl;
  CURLcode res;

  char* url = "https://ading.dev/";

  printf("downloading %s\n", url);
 
  curl = curl_easy_init();
  if (curl) {
    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_PROXY, "socks5h://127.0.0.1:1234");
    curl_easy_setopt(curl, CURLOPT_PROXYTYPE, CURLPROXY_SOCKS5);
    curl_easy_setopt(curl, CURLOPT_CAINFO, "/cacert.pem");
    curl_easy_setopt(curl, CURLOPT_CAPATH, "/cacert.pem");
    
    /* example.com is redirected, so we tell libcurl to follow redirection */
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
 
    /* Perform the request, res will get the return code */
    res = curl_easy_perform(curl);
    /* Check for errors */
    if(res != CURLE_OK)
      fprintf(stderr, "curl_easy_perform() failed: %s\n",
              curl_easy_strerror(res));
 
    /* always cleanup */
    curl_easy_cleanup(curl);
  }
  return 0;
}