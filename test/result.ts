import 'mocha';
import { Parse, Parser, Input, IInput, Result } from 'sprache';
import { expect, assert } from 'chai';
import { AssertParser } from './assertParser';
import { AssertInput } from './assertInput';

function String_prototype_includes(this: string, search: string, start?: number) {
    if (typeof start !== 'number') {
        start = 0;
    }

    if (start + search.length > this.length) {
        return false;
    } else {
        return this.indexOf(search, start) !== -1;
    }
}

describe('Result<T>', () => {

    it('FailureContainingBracketFormattedSuccessfully', () => {
        const p = Parse.string("xy").text().xMany().end();
        const r = p.tryParse("x{");
        assert.isTrue(String_prototype_includes.call(r.message!, "unexpected '{'"));
    });

    it('FailureShowsNearbyParseResults', () => {
        const p = Parse.query<string>(function*() {
            const a = yield Parse.char('x');
            const b = yield Parse.char('y');
            return Parse.return(`${a},${b}`);
        });

        const r = p.tryParse("x{");

        const expectedMessage = "Parsing failure: unexpected '{'; expected y (Line 1, Column 2); recently consumed: x";

        assert.equal(expectedMessage, r.toString());
    });
});
