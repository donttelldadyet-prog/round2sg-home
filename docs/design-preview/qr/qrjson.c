/* prints a JSON object {text: [row strings of 0/1]} for each argument – same encoder + settings as the PS4 tile */
#include <stdio.h>
#include "qrcodegen.h"
int main(int c, char **v) {
  static uint8_t qr[qrcodegen_BUFFER_LEN_MAX], tmp[qrcodegen_BUFFER_LEN_MAX];
  printf("{");
  for (int a = 1; a < c; a++) {
    if (!qrcodegen_encodeText(v[a], tmp, qr, qrcodegen_Ecc_MEDIUM, qrcodegen_VERSION_MIN, qrcodegen_VERSION_MAX, qrcodegen_Mask_AUTO, true)) return 1;
    int q = qrcodegen_getSize(qr); printf("%s\"%s\":[", a > 1 ? "," : "", v[a]);
    for (int r = 0; r < q; r++) { printf("%s\"", r ? "," : ""); for (int k = 0; k < q; k++) putchar(qrcodegen_getModule(qr, k, r) ? '1' : '0'); printf("\""); }
    printf("]");
  }
  printf("}\n"); return 0;
}
