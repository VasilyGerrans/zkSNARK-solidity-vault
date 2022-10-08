#!/bin/bash

CIRCUIT=withdraw

if [ "$1" ]; then
    CIRCUIT=$1
fi

rm ${CIRCUIT}_0000.zkey
rm ${CIRCUIT}_final.zkey
rm ${CIRCUIT}.r1cs
rm ${CIRCUIT}.sym
rm verification_key.json
rm -rf ${CIRCUIT}_js
rm proof.json
rm public.json
rm ${CIRCUIT}Verifier.sol
