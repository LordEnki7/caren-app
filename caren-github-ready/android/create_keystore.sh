#!/bin/bash

# Set Java environment
export JAVA_HOME=$(find /nix/store -name "openjdk-17*" -type d | head -1)
export PATH=$JAVA_HOME/bin:$PATH

# Create keystore non-interactively
keytool -genkey -noprompt \
  -v \
  -keystore caren-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias caren-key \
  -dname "CN=CAREN App, OU=Safety Department, O=CAREN Inc, L=City, S=State, C=US" \
  -storepass carenstore123 \
  -keypass carenkey123

echo "Keystore created successfully!"