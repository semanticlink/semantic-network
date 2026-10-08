// mismatched@2.11.1 still calls Node's removed util.isFunction API.
// Keep this compatibility shim scoped to the Jest environment.
const nodeUtil = require('util');

if (!nodeUtil.isFunction) {
    nodeUtil.isFunction = value => typeof value === 'function';
}
