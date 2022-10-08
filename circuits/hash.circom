// @note Leftover circuit.

pragma circom 2.0.2;

include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";

template Hash() {
    signal input hash_pk[2];
    signal output result[2];

    component hash_pk_0 = Num2Bits(128);
    component hash_pk_1 = Num2Bits(128);

    hash_pk_0.in <== hash_pk[0];
    hash_pk_1.in <== hash_pk[1];

    component hash_bits_local = Sha256(256);
    for (var i = 0; i < 256; i++) {
        if (i < 128) {
            hash_bits_local.in[i] <== hash_pk_1.out[127 - i];
        } else {
            hash_bits_local.in[i] <== hash_pk_0.out[255 - i];
        }
    }

    component result_1 = Bits2Num(128);
    component result_2 = Bits2Num(128);
    for (var i = 0; i < 256; i++) {
        if (i < 128) {
            result_1.in[i] <== hash_bits_local.out[255 - i];
        } else {
            result_2.in[i - 128] <== hash_bits_local.out[255 - i];
        }
    }

    result[0] <== result_1.out;
    result[1] <== result_2.out;
}

component main {public [hash_pk]} = Hash();
