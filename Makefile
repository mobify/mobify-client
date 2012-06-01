TESTS = test/*.coffee

all: 
	archive

archive: 
	git-archive-all --prefix='mobify/' tmp.tar 
	tar -xf tmp.tar
	tar -czhf mobify.`bin/mobify.js -V`.tgz mobify
	rm -rf mobify;
	rm tmp.tar

tests:
	node ./node_modules/.bin/mocha \
        -u exports \
        --compilers coffee:coffee-script \
        --globals p,last,tail,vars,newBlocks,preview \
        $(TESTS)

jenkins:
	node ./node_modules/.bin/mocha \
        -u exports \
        -R xunit \
        --compilers coffee:coffee-script \
        --globals p,last,tail,vars,newBlocks,preview \
        $(TESTS) | grep '<*>' | tee report.xml
