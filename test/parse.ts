import 'mocha';
import { Parse, Parser } from '../src/parse';
import { Result } from '../src/result';
import { expect, assert } from 'chai';
import { AssertParser } from './assertParser';

const ASeq: Parser<string[]> = Parse.query<any, string[]>(function*() {
    const first = yield Parse.ref(() => ASeq);
    const comma = yield Parse.char(',');
    const rest = yield Parse.char('a').once();
    return Parse.return(first.concat(rest));
}).or(Parse.char('a').once());

const ABSeq: Parser<string[]> = Parse.query<any, string[]>(function*() {
    const first = yield Parse.ref(() => BASeq);
    const rest = yield Parse.char('a').once();
    return Parse.return(first.concat(rest));
}).or(Parse.char('a').once());

const BASeq: Parser<string[]> = Parse.query<any, string[]>(function*() {
    const first = yield Parse.ref(() => ABSeq);
    const rest = yield Parse.char('b').once();
    return Parse.return(first.concat(rest));
}).or(Parse.char('b').once());

describe('parser of char', () => {

    it('should Parser_OfChar_AcceptsThatChar', () => {
        AssertParser.SucceedsWithOne(Parse.char('a').once(), "a", 'a');
    });

    it('should Parser_OfChar_AcceptsOnlyOneChar', () => {
        AssertParser.SucceedsWithOne(Parse.char('a').once(), "aaa", 'a');
    });

    it('should Parser_OfChar_DoesNotAcceptNonMatchingChar', () => {
        AssertParser.FailsAt(Parse.char('a').once(), "b", 0);
    });

    it('should Parser_OfChar_DoesNotAcceptEmptyInput', () => {
        AssertParser.Fails(Parse.char('a').once(), "");
    });

    it('should Parser_OfChars_AcceptsAnyOfThoseChars', () => {
        const parser = Parse.chars('a', 'b', 'c').once();
        AssertParser.SucceedsWithOne(parser, "a", 'a');
        AssertParser.SucceedsWithOne(parser, "b", 'b');
        AssertParser.SucceedsWithOne(parser, "c", 'c');
    });

    it('should Parser_OfChars_UsingString_AcceptsAnyOfThoseChars', () => {
        const parser = Parse.chars("abc").once();
        AssertParser.SucceedsWithOne(parser, "a", 'a');
        AssertParser.SucceedsWithOne(parser, "b", 'b');
        AssertParser.SucceedsWithOne(parser, "c", 'c');
    });

    it('should Parser_OfManyChars_AcceptsEmptyInput', () => {
        AssertParser.SucceedsWithAll(Parse.char('a').many(), "");
    });

    it('should Parser_OfManyChars_AcceptsManyChars', () => {
        AssertParser.SucceedsWithAll(Parse.char('a').many(), "aaa");
    });

    it('should Parser_OfAtLeastOneChar_DoesNotAcceptEmptyInput', () => {
        AssertParser.Fails(Parse.char('a').atLeastOnce(), "");
    });

    it('should Parser_OfAtLeastOneChar_AcceptsOneChar', () => {
        AssertParser.SucceedsWithAll(Parse.char('a').atLeastOnce(), "a");
    });

    it('should Parser_OfAtLeastOneChar_AcceptsManyChars', () => {
        AssertParser.SucceedsWithAll(Parse.char('a').atLeastOnce(), "aaa");
    });

    it('should ConcatenatingParsers_ConcatenatesResults', () => {
        const p = Parse.char('a').once().then(a =>
            Parse.char('b').once().select(b => a.concat(b)));
        AssertParser.SucceedsWithAll(p, "ab");
    });

    it('should ReturningValue_DoesNotAdvanceInput', () => {
        const p = Parse.return(1);
        AssertParser.SucceedsWith(p, "abc", n => assert.equal(1, n));
    });

    it('should ReturningValue_ReturnsValueAsResult', () => {
        const p = Parse.return(1);
        const r = p.tryParse("abc") as Result<number>;
        assert.equal(0, r.remainder.position);
    });

    it('should CanSpecifyParsersUsingQueryComprehensions', () => {
        const p = Parse.query<any, string[]>(function*() {
            const a = yield Parse.char('a').once();
            const bs = yield Parse.char('b').many();
            const cs = yield Parse.char('c').atLeastOnce();
            return Parse.return(a.concat(bs).concat(cs));
        });

        AssertParser.SucceedsWithAll(p, "abbbc");
    });

    it('should WhenFirstOptionSucceedsButConsumesNothing_SecondOptionTried', () => {
        const p = Parse.char('a').many().xOr(Parse.char('b').many());
        AssertParser.SucceedsWithAll(p, "bbb");
    });

    it('should WithXOr_WhenFirstOptionFailsAndConsumesInput_SecondOptionNotTried', () => {
        const first = Parse.char('a').once().concat(Parse.char('b').once());
        const second = Parse.char('a').once();
        const p = first.xOr(second);
        AssertParser.FailsAt(p, "a", 1);
    });

    it('should WithOr_WhenFirstOptionFailsAndConsumesInput_SecondOptionTried', () => {
        const first = Parse.char('a').once().concat(Parse.char('b').once());
        const second = Parse.char('a').once();
        const p = first.or(second);
        AssertParser.SucceedsWithAll(p, "a");
    });

    it('should ParsesString_AsSequenceOfChars', () => {
        const p = Parse.string("abc");
        AssertParser.SucceedsWithAll(p, "abc");
    });

    it('should DetectsLeftRecursion', () => {
        assert.throws(() => ASeq.tryParse("a,a,a"));
    });

    it('should DetectsMutualLeftRecursion', () => {
        assert.throws(() => ABSeq.end().tryParse("baba"));
    });

    it('should WithMany_WhenLastElementFails_FailureReportedAtLastElement', () => {
        const ab = Parse.query(function*() {
            const a = yield Parse.char('a');
            const b = yield Parse.char('b');
            return Parse.return("ab");
        });

        const p = ab.many().end();

        AssertParser.FailsAt(p, "ababaf", 4);
    });

    it('should WithXMany_WhenLastElementFails_FailureReportedAtLastElement', () => {
        const ab = Parse.query(function*() {
            const a = yield Parse.char('a');
            const b = yield Parse.char('b');
            return Parse.return("ab");
        });

        const p = ab.xMany().end();

        AssertParser.FailsAt(p, "ababaf", 5);
    });

    it('should ExceptStopsConsumingInputWhenExclusionParsed', () => {
        const exceptAa = Parse.anyChar.except(Parse.string("aa")).many().text();
        AssertParser.SucceedsWith(exceptAa, "abcaab", r => assert.equal("abc", r));
    });

    it('should UntilProceedsUntilTheStopConditionIsMetAndReturnsAllButEnd', () => {
        const untilAa = Parse.anyChar.until(Parse.string("aa")).text();
        const r = untilAa.tryParse("abcaab");
        // Assert.IsType<Result<string>>(r);
        const s = r as Result<string>;
        assert.equal("abc", s.value);
        assert.equal(5, s.remainder.position);
    });

    it('should OptionalParserConsumesInputOnSuccessfulMatch', () => {
        const optAbc = Parse.string("abc").text().optional();
        const r = optAbc.tryParse("abcd");
        assert.isTrue(r.wasSuccessful);
        assert.equal(3, r.remainder.position);
        // assert.isTrue(r.wasSuccessful.IsDefined);
        assert.equal("abc", r.value);
    });

    it('should OptionalParserDoesNotConsumeInputOnFailedMatch', () => {
        const optAbc = Parse.string("abc").text().optional();
        const r = optAbc.tryParse("d");
        assert.isTrue(r.wasSuccessful);
        assert.equal(0, r.remainder.position);
        assert.isTrue(r.value === undefined);
    });

    // it('should RegexParserConsumesInputOnSuccessfulMatch', () => {
    //     const digits = Parse.regex(/\d+/);
    //     const r = digits.tryParse("123d");
    //     assert.isTrue(r.wasSuccessful);
    //     assert.equal("123", r.value);
    //     assert.equal(3, r.remainder.position);
    // });

    // it('should RegexParserDoesNotConsumeInputOnFailedMatch', () => {
    //     const digits = Parse.regex(/\d+/);
    //     const r = digits.tryParse("d123");
    //     assert.isFalse(r.wasSuccessful);
    //     assert.equal(0, r.remainder.position);
    // });

    // it('should RegexMatchParserConsumesInputOnSuccessfulMatch', () => {
    //     const digits = Parse.regexMatch(/\d(\d*)/);
    //     const r = digits.tryParse("123d");
    //     assert.isTrue(r.wasSuccessful);
    //     assert.equal("123", r.value.value);
    //     assert.equal("23", r.value.Groups[1].value);
    //     assert.equal(3, r.remainder.position);
    // });

    // it('should RegexMatchParserDoesNotConsumeInputOnFailedMatch', () => {
    //     const digits = Parse.regexMatch(/\d+/);
    //     const r = digits.tryParse("d123");
    //     assert.isFalse(r.wasSuccessful);
    //     assert.equal(0, r.remainder.position);
    // });

    // it('should PositionedParser', () => {
    //     const pos = Parse.query(function*() {
    //         const s = yield Parse.string("winter").text()
    //         return Parse.return(new PosAwareStr { Value = s })
    //     }).positioned();

    //     var r = pos.tryParse("winter");
    //     assert.isTrue(r.wasSuccessful);
    //     assert.equal(0, r.value.Pos.Pos);
    //     assert.equal(6, r.value.Length);
    // });

    it('should xAtLeastOnceParser_WhenLastElementFails_FailureReportedAtLastElement', () => {
        const ab = Parse.string("ab").text();
        const p = ab.xAtLeastOnce().end();
        AssertParser.FailsAt(p, "ababaf", 5);
    });

    it('should xAtLeastOnceParser_WhenFirstElementFails_FailureReportedAtFirstElement', () => {
        const ab = Parse.string("ab").text();
        const p = ab.xAtLeastOnce().end();
        AssertParser.FailsAt(p, "d", 0);
    });

    it('should NotParserConsumesNoInputOnFailure', () => {
        const notAb = Parse.string("ab").text().not();
        AssertParser.FailsAt(notAb, "abc", 0);
    });

    it('should NotParserConsumesNoInputOnSuccess', () => {
        const notAb = Parse.string("ab").text().not();
        const r = notAb.tryParse("d");
        assert.isTrue(r.wasSuccessful);
        assert.equal(0, r.remainder.position);
    });

    it('should IgnoreCaseParser', () => {
        const ab = Parse.ignoreCase("ab").text();
        AssertParser.SucceedsWith(ab, "Ab", m => assert.equal("Ab", m));
    });

    it('should RepeatParserConsumeInputOnSuccessfulMatch', () => {
        const repeated = Parse.char('a').repeat(3);
        const r = repeated.tryParse("aaabbb");
        assert.isTrue(r.wasSuccessful);
        assert.equal(3, r.remainder.position);
    });

    it('should RepeatParserDoesntConsumeInputOnFailedMatch', () => {
        const repeated = Parse.char('a').repeat(3);
        const r = repeated.tryParse("bbbaaa");
        assert.isTrue(!r.wasSuccessful);
        assert.equal(0, r.remainder.position);
    });

    it('should RepeatParserCanParseWithCountOfZero', () => {
        const repeated = Parse.char('a').repeat(0);
        const r = repeated.tryParse("bbb");
        assert.isTrue(r.wasSuccessful);
        assert.equal(0, r.remainder.position);
    });

    it('should RepeatParserCanParseAMinimumNumberOfValues', () => {
        const repeated = Parse.char('a').repeat(4, 5);

        // Test failure.
        let r = repeated.tryParse("aaa");
        assert.isFalse(r.wasSuccessful);
        assert.equal(0, r.remainder.position);

        // Test success.
        r = repeated.tryParse("aaaa");
        assert.isTrue(r.wasSuccessful);
        assert.equal(4, r.remainder.position);
    });

    it('should RepeatParserCanParseAMaximumNumberOfValues', () => {
        const repeated = Parse.char('a').repeat(4, 5);

        let r = repeated.tryParse("aaaa");
        assert.isTrue(r.wasSuccessful);
        assert.equal(4, r.remainder.position);

        r = repeated.tryParse("aaaaa");
        assert.isTrue(r.wasSuccessful);
        assert.equal(5, r.remainder.position);

        r = repeated.tryParse("aaaaaa");

        assert.isTrue(r.wasSuccessful);
        assert.equal(5, r.remainder.position);
    });

    it('should RepeatParserErrorMessagesAreReadable', () => {
        const repeated = Parse.char('a').repeat(4, 5);

        const expectedMessage = "Parsing failure: Unexpected 'end of input'; expected 'a' between 4 and 5 times, but found 3";

        try {
            const r = repeated.parse("aaa");
        } catch (ex) {
            assert(ex.message.indexOf(expectedMessage) === 0, 'starts with');
        }
    });

    it('should CanParseSequence', () => {
        const sequence = Parse.char('a').delimitedBy(Parse.char(','));
        const r = sequence.tryParse("a,a,a");
        assert.isTrue(r.wasSuccessful);
        assert.isTrue(r.remainder.atEnd);
    });

    it('should FailGracefullyOnSequence', () => {
        const sequence = Parse.char('a').xDelimitedBy(Parse.char(','));
        AssertParser.FailsWith(sequence, "a,a,b", result => {
            assert.include(result.message as string, "unexpected 'b'");
            assert.includeMembers(result.expectations as string[], ["a"]);
        });
    });

    it('should CanParseContained', () => {
        const parser = Parse.char('a').contained(Parse.char('['), Parse.char(']'));
        const r = parser.tryParse("[a]");
        assert.isTrue(r.wasSuccessful);
        assert.isTrue(r.remainder.atEnd);
    });
});
