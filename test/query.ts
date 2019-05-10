import 'mocha';
import { Parse, Parser, Result } from 'sprache';
import { expect, assert } from 'chai';
import { AssertParser } from './assertParser';

describe('Query', () => {

    const Integer = Parse
        .digit
        .atLeastOnce()
        .text()
        .select(v => Number.parseInt(v, 10))
        .token()
        .named('an integer');

    const PlusSign = Parse.char('+', 'plus sign');

    const IntegerPlusInteger = Parse.query<{ a: number; b: number; }>(function* () {
        const a = yield Integer;
        yield PlusSign;
        const b = yield Integer;

        return Parse.return({
            a,
            b
        });
    });

    it('should Work?', () => {
        AssertParser.SucceedsWith(IntegerPlusInteger, "123+456", value => {
            expect(value.a).to.equal(123);
            expect(value.b).to.equal(456);
        });
    });

    it('should Consume on failure?', () => {
        AssertParser.FailsAt(IntegerPlusInteger, "123456", 6);
    });

    // TODO: test when a nested parser in the queryOr moves the remainer on failure (like query() does)
});


describe('QueryOr', () => {

    const AOrB = Parse.queryOr<string>(function* () {
        yield Parse.string('AAA').text();
        yield Parse.string('BB').text();
        yield Parse.string('C').text();
    });

    it('should ReturnsFirstMatching', () => {

        AssertParser.SucceedsWith(AOrB, "AAABBC---BB--C--", value => expect(value).to.equal("AAA"));
        AssertParser.SucceedsWith(AOrB, "BBAAA----", value => expect(value).to.equal("BB"));
    });

    it('should fail at starting position?', () => {
        AssertParser.Succeeds(AOrB, "BBAAA-----", result => expect(result.remainder.position).to.equal(2));
        AssertParser.Succeeds(AOrB, "CAAABB-------", result => expect(result.remainder.position).to.equal(1));
        AssertParser.FailsWith(AOrB, "XA", result => {
            expect(result.remainder.position).to.equal(0);
        });
    });
});
