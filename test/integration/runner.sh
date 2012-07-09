#!/bin/bash
node_modules/.bin/coffee test/integration/server.coffee &
PID=$!
sleep 1
phantomjs test/integration/phantom.coffee
STATUS=$?
kill $PID
exit $STATUS