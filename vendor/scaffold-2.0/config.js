require.config({
    "wrap": true,
    "baseUrl": ".",
    "keepBuildDir": true,
    "paths": {   
        "mobifyjs": "./node_modules/mobifyjs/src",
    },
    "shim": {
        "Zepto": {"exports": "$"}
    }
});
