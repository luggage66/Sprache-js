
# Sprache.js

sprache.js is a TypeScript port of [Sprache](https://github.com/sprache/Sprache), a simple parser for C#

[![Build Status](https://travis-ci.org/luggage66/Sprache-js.svg?branch=master)](https://travis-ci.org/luggage66/Sprache-js/branches) [![Coverage Status](https://coveralls.io/repos/github/luggage66/Sprache-js/badge.svg?branch=master)](https://coveralls.io/github/luggage66/Sprache-js?branch=master)

```sh
npm install sprache --save
```

## Usage

Unlike most parser-building frameworks, you use Sprache from your program code, and don't need to set up any build-time code generation tasks.

A simple parser might parse a sequence of characters:

```js
import { Parse } from 'sprache';

// Parse any number of capital 'A's in a row
var parseA = Parse.char('A').atLeastOnce();
```

Sprache provides a number of built-in functions that can make bigger parsers from smaller ones, often callable via generators:

```js
import { Parse } from 'sprache';

const identifier = Parse.query(function*() {
    const leading  = yield Parse.whiteSpace.many();
    const first    = yield Parse.letter.once();
    const rest     = yield Parse.letterOrDigit.many();
    const trailing = yield Parse.whiteSpace.many();

    return Parse.return([first].concat(rest).join(''));
});

var id = identifier.parse(" abc123  ");

Assert.isEqual("abc123", id);
```

## More Examples

More examples are available in [src/examples/](https://github.com/luggage66/Sprache-js/tree/master/src/examples)

## Building / Running examples

```sh
npm install
npm run build
npm run test
```

To run as example

```sh
npm run build && node dist/examples/sql
```

Is VSCode, just run task "npm: install", then F5 to run.
