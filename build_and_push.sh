#!/bin/sh
version=`cat version.txt`
docker build -t gcr.io/arcane-enigma/game:$version .
docker push gcr.io/arcane-enigma/game:$version
