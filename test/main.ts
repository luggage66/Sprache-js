import 'mocha';
import { Parse, Parser } from 'sprache';
import { expect } from 'chai';

describe('Hello World', () => {
    it('should work', () => {
        const identifier: Parser<string> = Parse.query(function*() {
            const leading = yield Parse.whiteSpace.many();
            const first = yield Parse.letter.once();
            const rest = yield Parse.letterOrDigit.many();
            const trailing = yield Parse.whiteSpace.many();
            return Parse.return([first].concat(rest).join(''));
        });

        const id = identifier.parse(" abc123  ");

        expect(id).to.equal("abc123");
    });
});