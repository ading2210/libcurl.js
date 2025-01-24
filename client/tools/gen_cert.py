import sys
import base64
import re

with open(sys.argv[1]) as f:
  pem_file = f.read()

cert_regex = r'-----BEGIN CERTIFICATE-----\n(.+?)\n-----END CERTIFICATE-----'
cert_template = "-----BEGIN CERTIFICATE-----\n{b64}\n-----END CERTIFICATE-----"
certs_b64 = re.findall(cert_regex, pem_file, flags=re.S)
certs_b64 = [s.replace("\n", "") for s in certs_b64]

certs_str = "\n".join(cert_template.format(b64=s) for s in certs_b64)
total_len = len(certs_str)

header_part_template = """
static uint8_t _cert_{num}[] = {array};
"""
header_end_template = """
uint8_t* _certs[] = {certs_array};
uint16_t _cert_lengths[] = {lengths_array};
uint16_t _cert_count = {cert_count};
"""

header_file = "#include <stdint.h>"
cert_lens = []
cert_count = len(certs_b64)
for i, cert_b64 in enumerate(certs_b64):
  cert = base64.b64decode(cert_b64)
  cert_lens.append(len(cert))
  array_str = "{" + ",".join(hex(byte) for byte in cert) + "}"
  header_file += header_part_template.format(num=i, array=array_str)

header_file += header_end_template.format(
  certs_array = "{" + ",".join(f"_cert_{i}" for i in range(cert_count)) + "}",
  lengths_array = "{" + ",".join(str(i) for i in cert_lens) + "}",
  cert_count=cert_count
)

print(header_file)