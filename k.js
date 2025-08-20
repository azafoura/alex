"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
function get_cookies(filepath) {
    var filecontent = fs_1.default.openSync(filepath, "utf-8");
    console.log(filecontent);
}
