#!/bin/sh
#prettier --write js/*.js *.js
clang-format -i -style=file macosx/*.{h,m*,c*} macosx/ghost-macosx_Helper/*.cpp
