#!/bin/bash
node_modules/.bin/coffee test/integration-tag/server.coffee &
PID=$!
sleep 1
phantomjs test/integration-tag/phantom.coffee
STATUS=$?
kill $PID
exit $STATUS