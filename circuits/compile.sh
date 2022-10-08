#!/bin/bash

CIRCUIT=withdraw
PTAU=17

if [ "$1" ]; then
    CIRCUIT=$1
fi

if [ "$2" ]; then
    PTAU=$2
fi

if [[ ! -f ./ptau/powersOfTau28_hez_final_${PTAU}.ptau ]]; then
    wget -P ./ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${PTAU}.ptau
fi

circom ${CIRCUIT}.circom --r1cs --wasm
snarkjs groth16 setup ${CIRCUIT}.r1cs ptau/powersOfTau28_hez_final_${PTAU}.ptau ${CIRCUIT}_0000.zkey
snarkjs zkey contribute ${CIRCUIT}_0000.zkey ${CIRCUIT}_final.zkey --name="1st Contributor Name" -v -e="some random text"
# snarkjs zkey export verificationkey ${CIRCUIT}_final.zkey verification_key.json
snarkjs zkey export solidityverifier ${CIRCUIT}_final.zkey ${CIRCUIT}Verifier.sol
node ${CIRCUIT}_js/generate_witness.js ${CIRCUIT}_js/${CIRCUIT}.wasm ${CIRCUIT}-input.json ${CIRCUIT}_js/witness.wtns
snarkjs groth16 prove ${CIRCUIT}_final.zkey ${CIRCUIT}_js/witness.wtns proof.json public.json
