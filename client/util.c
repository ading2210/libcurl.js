#include <string.h>

int starts_with(const char *a, const char *b) {
  return strncmp(a, b, strlen(b)) == 0;
}