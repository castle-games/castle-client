#!/usr/bin/env bash

INSTALL_PATH=build/Build/Products/Debug-iphonesimulator/iOSTestApp.app
HOST_OS_VERSION=$(sw_vers | grep ProductVersion)
OS_VERSION=$MAZE_SDK
OS_VERSION=com.apple.CoreSimulator.SimRuntime.iOS-"${OS_VERSION//\./$'-'}"
SIM_DEVICE="iPhone 8"

# Create required simulators
xcrun simctl create "maze-sim" "$SIM_DEVICE" "$OS_VERSION"

# Simulators used in the test suite:
xcrun simctl boot "maze-sim"; true

# Check if simulator has finished boot process
xcrun simctl bootstatus "maze-sim"

# Install the app on each simulator
xcrun simctl install "maze-sim" "$INSTALL_PATH"

# Preheat the simulators by triggering a crash
xcrun simctl launch "maze-sim" com.bugsnag.iOSTestApp \
    "EVENT_TYPE=preheat"
