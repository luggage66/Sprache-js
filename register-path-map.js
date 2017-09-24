const tsConfigPaths = require("tsconfig-paths");
 
const baseUrl = "./dist"; // Either absolute or relative path. If relative it's resolved to current working directory.
tsConfigPaths.register({
    baseUrl: baseUrl,
    "paths": {
        "sprache": [ "src" ]
    }
});
