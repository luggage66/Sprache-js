
# yieldAST

yieldAST is a TypeScript port of [Sprache](https://github.com/sprache/Sprache), a simple parser for C#

[![Build Status](https://travis-ci.org/luggage66/yieldAST.svg?branch=master)](https://travis-ci.org/luggage66/yieldAST/branches) [![Coverage Status](https://coveralls.io/repos/github/luggage66/yieldAST/badge.svg?branch=master)](https://coveralls.io/github/luggage66/yieldAST?branch=master) 

I project is still in early development.

### Usage

Unlike most parser-building frameworks, you use Sprache yieldAST from your program code, and don't need to set up any build-time code generation tasks.

A simple parser might parse a sequence of characters:

```js
// Parse any number of capital 'A's in a row
var parseA = Parse.char('A').atLeastOnce();
```

Sprache provides a number of built-in functions that can make bigger parsers from smaller ones, often callable via Linq query comprehensions:

```js
const identifier: Parser<string> = Parse.query(function*() {
    const leading = yield Parse.whiteSpace.many();
    const first = yield Parse.letter.once();
    const rest = yield Parse.letterOrDigit.many();
    const trailing = yield Parse.whiteSpace.many();
    return Parse.return([first].concat(rest).join(''));
});

var id = identifier.parse(" abc123  ");

Assert.isEqual("abc123", id);
```

To build

```sh
npm install
npm run build # or: ./node_modules/.bin/tsc
```

To run

```sh
npm start # or: node dist/index
```

Is VSCode, just run task "npm: install", then F5 to run.
