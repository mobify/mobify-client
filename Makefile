TESTS = test/*.coffee

install:
	npm install
	git submodule update --init --recursive


all: 
	archive

archive: 
	git submodule update --init --recursive
	git-archive-all --prefix='mobify-client/' tmp.tar 
	tar -xf tmp.tar
	tar -czhf mobify-client.`bin/mobify.js -V`.tgz mobify-client
	rm -rf mobify-client;
	rm tmp.tar

test:
	node ./node_modules/.bin/mocha \
        -u exports \
        --compilers coffee:coffee-script \
        --ignore-leaks  \
        --timeout 10000  \
        $(TESTS)

integrate:
	test/integration/runner.sh

jenkins:
	node ./node_modules/.bin/mocha \
        -u exports \
        -R xunit \
        --compilers coffee:coffee-script \
        --ignore-leaks  \
        --timeout 10000  \
        $(TESTS) | egrep '^<?\test.*>' | tee report.xml

.PHONY: test
