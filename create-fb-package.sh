#!/bin/bash
mkdir fb
cp -r dist fb
cp -r static fb
cp -r node_modules/rpg-awesome fb/static
cp index.fb.html fb/index.html
cp fbapp-config.json fb
