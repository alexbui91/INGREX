#!/bin/bash

../../../../../thirdparty/protobuf-lib/bin/protoc \
--plugin ../node_modules/.bin/protoc-gen-ts \
--js_out "import_style=commonjs,binary:./app/interface" \
--ts_out "service=grpc-web:./app/interface" \
./interface.proto