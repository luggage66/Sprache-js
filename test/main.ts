import 'mocha';
import { Parse, Parser } from '../src/parse';
import { expect } from 'chai';
// if you used the '@types/mocha' method to install mocha type definitions, uncomment the following line

describe('Hello function', () => {
    it('should return hello world', () => {
        const identifier: Parser<string> = Parse.query(function*() {
            const leading = yield Parse.whiteSpace.many();
            const first = yield Parse.letter.once();
            const rest = yield Parse.letterOrDigit.many();
            const trailing = yield Parse.whiteSpace.many();
            return Parse.return([first].concat(rest).join('')) as any;
        });

        const id = identifier.parse(" abc123  ");

        expect(id).to.equal("abc123");
    });
});
