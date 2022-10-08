pragma circom 2.0.2;

include "../node_modules/circomlib/circuits/binsum.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "../node_modules/circomlib/circuits/sha256/sha256.circom";

template PairToBits() {
    signal input in[2];
    signal output out[256];

    component bits_0 = Num2Bits(128);
    component bits_1 = Num2Bits(128);

    bits_0.in <== in[0];
    bits_1.in <== in[1];

    for (var i = 0; i < 256; i++) {
        if (i < 128) {
            out[i] <== bits_0.out[i];
        } else {
            out[i] <== bits_1.out[i - 128];
        }
    }
}

template Withdraw() {
    // public 
    signal input hash[2];

    // private
    signal input hash_pk[2];
    signal input address;
    signal input salt[2];

    // output
    signal output withdraw_id[2];

    // convert inputs to bit arrays
    component bits_hash = PairToBits();
    component bits_hash_pk = PairToBits();
    component bits_salt = PairToBits();
    for (var i = 0; i < 2; i++) {
        bits_hash.in[i] <== hash[i];
        bits_hash_pk.in[i] <== hash_pk[i];
        bits_salt.in[i] <== salt[i];
    }
    component bits_address = Num2Bits(160);
    bits_address.in <== address;

    // concat elements into SHA256
    component bits_withdraw_id = Sha256(672);
    for (var i = 0; i < 672; i++) {
        if (i < 256) {
            bits_withdraw_id.in[i] <== bits_salt.out[255 - i];
        } else if (i < 416) {
            bits_withdraw_id.in[i] <== bits_address.out[159 + 256 - i];
        } else {
            bits_withdraw_id.in[i] <== bits_hash_pk.out[255 + 416 - i];
        }
    }

    // convert SHA256 output to integer pair
    component withdraw_id_0 = Bits2Num(128);
    component withdraw_id_1 = Bits2Num(128);
    for (var i = 0; i < 256; i++) {
        if (i < 128) {
            withdraw_id_0.in[i] <== bits_withdraw_id.out[255 - i];
        } else {
            withdraw_id_1.in[i - 128] <== bits_withdraw_id.out[255 - i];
        }
    }

    withdraw_id[0] <== withdraw_id_0.out;
    withdraw_id[1] <== withdraw_id_1.out;

    // compute hash
    component bits_hash_local = Sha256(256);
    for (var i = 0; i < 256; i++) {
        bits_hash_local.in[i] <== bits_hash_pk.out[255 - i];
    }

    for (var i = 0; i < 256; i++) {
        bits_hash.out[i] === bits_hash_local.out[255 - i];
    }
}

component main {public [hash, address]} = Withdraw();

