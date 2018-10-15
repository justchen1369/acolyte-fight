#!/bin/sh
docker build -t gcr.io/arcane-enigma/game:staging . \
	&& docker push gcr.io/arcane-enigma/game:staging
