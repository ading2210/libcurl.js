#include <stdlib.h>
#include <string.h>

#include "curl/curl.h"
#include "mbedtls/base64.h"

#include "cacert.h"

struct curl_blob cacert_blob;
unsigned char* cacert_pem;
int cacert_pem_len;

unsigned char* get_cacert() {
  return cacert_pem;
}

//generate a pem file from the stored binary certificates
void generate_pem() {
  char* begin_cert_str = "-----BEGIN CERTIFICATE-----\n";
  int begin_cert_len = strlen(begin_cert_str);
  char* end_cert_str = "\n-----END CERTIFICATE-----\n";
  int end_cert_len = strlen(end_cert_str);

  //calculate total length of the pem file
  cacert_pem_len = 0;
  for (int i = 0; i < _cert_count; i++) {
    int cert_len = _cert_lengths[i];
    int b64_len = ((4 * cert_len / 3) + 3) & ~3;
    cacert_pem_len += begin_cert_len + end_cert_len + b64_len;
  }
  cacert_pem = malloc(cacert_pem_len + 1);

  //loop for base64 encoding each part
  int offset = 0;
  for (int i = 0; i < _cert_count; i++) {
    unsigned char* cert = _certs[i];
    int cert_len = _cert_lengths[i];
    int b64_len = ((4 * cert_len / 3) + 3) & ~3;
    
    strcpy((char*) (cacert_pem + offset), begin_cert_str);
    offset += begin_cert_len;

    size_t olen;
    mbedtls_base64_encode(cacert_pem + offset, b64_len+1, &olen, cert, cert_len);
    offset += b64_len;

    strcpy((char*) (cacert_pem + offset), end_cert_str);
    offset += end_cert_len;
  }
  cacert_pem[cacert_pem_len-1] = '\0';
}

void init_curl() {
  curl_global_init(CURL_GLOBAL_DEFAULT);
  generate_pem();

  //tell curl to use our generated pem file
  cacert_blob.data = cacert_pem;
  cacert_blob.len = cacert_pem_len;
  cacert_blob.flags = CURL_BLOB_NOCOPY;
}