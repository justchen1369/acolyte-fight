#!/bin/sh
docker build -t gcr.io/arcane-enigma/game:latest . \
	&& docker push gcr.io/arcane-enigma/game:latest
