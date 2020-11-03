import { Parse, Parser, Result } from '../';
import { AssertParser } from './assertParser.util';
import 'jest-extended';

const ASeq: Parser<string[]> = Parse.query<string[]>(function*() {
    const first = (yield Parse.ref(() => ASeq)) as unknown as string[];
    const comma = yield Parse.char(',');
    const rest = (yield Parse.char('a').once()) as unknown as string[];
    return Parse.return(first.concat(rest));
}).or(Parse.char('a').once());

const ABSeq: Parser<string[]> = Parse.query<string[]>(function*() {
    const first = (yield Parse.ref(() => BASeq)) as unknown as string[];
    const rest = (yield Parse.char('a').once()) as unknown as string[];
    return Parse.return(first.concat(rest));
}).or(Parse.char('a').once());

const BASeq: Parser<string[]> = Parse.query<string[]>(function*() {
    const first = (yield Parse.ref(() => ABSeq)) as unknown as string[];
    const rest = (yield Parse.char('b').once()) as unknown as string[];
    return Parse.return(first.concat(rest));
}).or(Parse.char('b').once());

describe('parser of char', () => {
    beforeAll(() => {
        expect.hasAssertions();
    });

    it('should Parser_OfChar_AcceptsThatChar', () => {
        AssertParser.SucceedsWithOne(Parse.char('a').once(), 'a', 'a');
    });

    it('should Parser_OfChar_AcceptsOnlyOneChar', () => {
        AssertParser.SucceedsWithOne(Parse.char('a').once(), 'aaa', 'a');
    });

    it('should Parser_OfChar_DoesNotAcceptNonMatchingChar', () => {
        AssertParser.FailsAt(Parse.char('a').once(), 'b', 0);
    });

    it('should Parser_OfChar_DoesNotAcceptEmptyInput', () => {
        AssertParser.Fails(Parse.char('a').once(), '');
    });

    it('should Parser_OfChars_AcceptsAnyOfThoseChars', () => {
        const parser = Parse.chars('a', 'b', 'c').once();
        AssertParser.SucceedsWithOne(parser, 'a', 'a');
        AssertParser.SucceedsWithOne(parser, 'b', 'b');
        AssertParser.SucceedsWithOne(parser, 'c', 'c');
    });

    it('should Parser_OfChars_UsingString_AcceptsAnyOfThoseChars', () => {
        const parser = Parse.chars('abc').once();
        AssertParser.SucceedsWithOne(parser, 'a', 'a');
        AssertParser.SucceedsWithOne(parser, 'b', 'b');
        AssertParser.SucceedsWithOne(parser, 'c', 'c');
    });

    it('should Parser_OfManyChars_AcceptsEmptyInput', () => {
        AssertParser.SucceedsWithAll(Parse.char('a').many(), '');
    });

    it('should Parser_OfManyChars_AcceptsManyChars', () => {
        AssertParser.SucceedsWithAll(Parse.char('a').many(), 'aaa');
    });

    it('should Parser_OfAtLeastOneChar_DoesNotAcceptEmptyInput', () => {
        AssertParser.Fails(Parse.char('a').atLeastOnce(), '');
    });

    it('should Parser_OfAtLeastOneChar_AcceptsOneChar', () => {
        AssertParser.SucceedsWithAll(Parse.char('a').atLeastOnce(), 'a');
    });

    it('should Parser_OfAtLeastOneChar_AcceptsManyChars', () => {
        AssertParser.SucceedsWithAll(Parse.char('a').atLeastOnce(), 'aaa');
    });

    it('should ConcatenatingParsers_ConcatenatesResults', () => {
        const p = Parse.char('a')
            .once()
            .then(a =>
                Parse.char('b')
                    .once()
                    .select(b => a.concat(b))
            );
        AssertParser.SucceedsWithAll(p, 'ab');
    });

    it('should ReturningValue_DoesNotAdvanceInput', () => {
        const p = Parse.return(1);
        AssertParser.SucceedsWith(p, 'abc', n => expect(n).toBe(1));
    });

    it('should ReturningValue_ReturnsValueAsResult', () => {
        const p = Parse.return(1);
        const r = p.tryParse('abc') as Result<number>;
        expect(r).toMatchObject({
            remainder: {
                position: 0
            }
        });
    });

    it('should CanSpecifyParsersUsingQueryComprehensions', () => {
        const p = Parse.query<string[]>(function*() {
            const a = (yield Parse.char('a').once()) as unknown as string[];
            const bs = (yield Parse.char('b').many()) as unknown as string[];
            const cs = (yield Parse.char('c').atLeastOnce()) as unknown as string[];
            return Parse.return(a.concat(bs).concat(cs));
        });

        AssertParser.SucceedsWithAll(p, 'abbbc');
    });

    it('should WhenFirstOptionSucceedsButConsumesNothing_SecondOptionTried', () => {
        const p = Parse.char('a')
            .many()
            .xOr(Parse.char('b').many());
        AssertParser.SucceedsWithAll(p, 'bbb');
    });

    it('should WithXOr_WhenFirstOptionFailsAndConsumesInput_SecondOptionNotTried', () => {
        const first = Parse.char('a')
            .once()
            .concat(Parse.char('b').once());
        const second = Parse.char('a').once();
        const p = first.xOr(second);
        AssertParser.FailsAt(p, 'a', 1);
    });

    it('should WithOr_WhenFirstOptionFailsAndConsumesInput_SecondOptionTried', () => {
        const first = Parse.char('a')
            .once()
            .concat(Parse.char('b').once());
        const second = Parse.char('a').once();
        const p = first.or(second);
        AssertParser.SucceedsWithAll(p, 'a');
    });

    it('should ParsesString_AsSequenceOfChars', () => {
        const p = Parse.string('abc');
        AssertParser.SucceedsWithAll(p, 'abc');
    });

    it('should DetectsLeftRecursion', () => {
        expect(() => ASeq.tryParse('a,a,a')).toThrowError();
    });

    it('should DetectsMutualLeftRecursion', () => {
        expect(() => ABSeq.end().tryParse('baba')).toThrowError();
    });

    it('should WithMany_WhenLastElementFails_FailureReportedAtLastElement', () => {
        const ab = Parse.query(function*() {
            const a = yield Parse.char('a');
            const b = yield Parse.char('b');
            return Parse.return('ab');
        });

        const p = ab.many().end();

        AssertParser.FailsAt(p, 'ababaf', 4);
    });

    it('should WithXMany_WhenLastElementFails_FailureReportedAtLastElement', () => {
        const ab = Parse.query(function*() {
            const a = yield Parse.char('a');
            const b = yield Parse.char('b');
            return Parse.return('ab');
        });

        const p = ab.xMany().end();

        AssertParser.FailsAt(p, 'ababaf', 5);
    });

    it('should ExceptStopsConsumingInputWhenExclusionParsed', () => {
        const exceptAa = Parse.anyChar
            .except(Parse.string('aa'))
            .many()
            .text();
        AssertParser.SucceedsWith(exceptAa, 'abcaab', r =>
            expect(r).toBe('abc')
        );
    });

    it('should UntilProceedsUntilTheStopConditionIsMetAndReturnsAllButEnd', () => {
        const untilAa = Parse.anyChar.until(Parse.string('aa')).text();
        const r = untilAa.tryParse('abcaab');
        // Assert.IsType<Result<string>>(r);
        const s = r as Result<string>;
        expect(s).toMatchObject({
            value: 'abc',
            remainder: {
                position: 5
            }
        });
    });

    it('should OptionalParserConsumesInputOnSuccessfulMatch', () => {
        const optAbc = Parse.string('abc')
            .text()
            .optional();
        const r = optAbc.tryParse('abcd');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 3
            },
            value: 'abc'
        });
    });

    it('should OptionalParserDoesNotConsumeInputOnFailedMatch', () => {
        const optAbc = Parse.string('abc')
            .text()
            .optional();
        const r = optAbc.tryParse('d');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 0
            },
            value: undefined
        });
    });

    it('should XOptionalParserConsumesInputOnSuccessfulMatch', () => {
        const optAbc = Parse.string('abc')
            .text()
            .xOptional();
        const r = optAbc.tryParse("abcd");

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 3
            },
            value: 'abc'
        });
    });

    it('should XOptionalParserDoesNotConsumeInputOnFailedMatch', () => {
        const optAbc = Parse.string('abc')
            .text()
            .xOptional();
        const r = optAbc.tryParse("d");

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 0
            },
            value: undefined
        });
    });

    it('should XOptionalParserFailsOnPartialMatch', () => {
        const optAbc = Parse.string('abc')
            .text()
            .xOptional();
        
        AssertParser.FailsAt(optAbc, 'abd', 2);
        AssertParser.FailsAt(optAbc, 'aa', 1);
    });

    it('should RegexParserConsumesInputOnSuccessfulMatch', () => {
        const digits = Parse.regex(/\d+/);
        const r = digits.tryParse('123d');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 3
            },
            value: '123'
        });
    });

    it('should RegexParserDoesNotConsumeInputOnFailedMatch', () => {
        const digits = Parse.regex(/\d+/);
        const r = digits.tryParse('d123');

        expect(r).toMatchObject({
            wasSuccessful: false,
            remainder: {
                position: 0
            }
        });
    });

    it('should RegexMatchParserConsumesInputOnSuccessfulMatch', () => {
        const digits = Parse.regexMatch(/\d(\d*)/);
        const r = digits.tryParse('123d');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 3
            },
            value: {
                0: '123',
                1: '23'
            }
        });
    });

    it('should RegexMatchParserDoesNotConsumeInputOnFailedMatch', () => {
        const digits = Parse.regexMatch(/\d+/);
        const r = digits.tryParse('d123');

        expect(r).toMatchObject({
            wasSuccessful: false,
            remainder: {
                position: 0
            }
        });
    });

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
        const ab = Parse.string('ab').text();
        const p = ab.xAtLeastOnce().end();
        AssertParser.FailsAt(p, 'ababaf', 5);
    });

    it('should xAtLeastOnceParser_WhenFirstElementFails_FailureReportedAtFirstElement', () => {
        const ab = Parse.string('ab').text();
        const p = ab.xAtLeastOnce().end();
        AssertParser.FailsAt(p, 'd', 0);
    });

    it('should NotParserConsumesNoInputOnFailure', () => {
        const notAb = Parse.string('ab')
            .text()
            .not();
        AssertParser.FailsAt(notAb, 'abc', 0);
    });

    it('should NotParserConsumesNoInputOnSuccess', () => {
        const notAb = Parse.string('ab')
            .text()
            .not();
        const r = notAb.tryParse('d');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 0
            }
        });
    });

    it('should IgnoreCaseParser', () => {
        const ab = Parse.ignoreCase('ab').text();
        AssertParser.SucceedsWith(ab, 'Ab', m => expect(m).toBe('Ab'));
    });

    it('should RepeatParserConsumeInputOnSuccessfulMatch', () => {
        const repeated = Parse.char('a').repeat(3);
        const r = repeated.tryParse('aaabbb');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 3
            }
        });
    });

    it('should RepeatParserDoesntConsumeInputOnFailedMatch', () => {
        const repeated = Parse.char('a').repeat(3);
        const r = repeated.tryParse('bbbaaa');

        expect(r).toMatchObject({
            wasSuccessful: false,
            remainder: {
                position: 0
            }
        });
    });

    it('should RepeatParserCanParseWithCountOfZero', () => {
        const repeated = Parse.char('a').repeat(0);
        const r = repeated.tryParse('bbb');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 0
            }
        });
    });

    it('should RepeatParserCanParseAMinimumNumberOfValues', () => {
        const repeated = Parse.char('a').repeat(4, 5);

        let r = repeated.tryParse('aaa');

        expect(r).toMatchObject({
            wasSuccessful: false,
            remainder: {
                position: 0
            }
        });

        r = repeated.tryParse('aaaa');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 4
            }
        });
    });

    it('should RepeatParserCanParseAMaximumNumberOfValues', () => {
        const repeated = Parse.char('a').repeat(4, 5);

        let r = repeated.tryParse('aaaa');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 4
            }
        });

        r = repeated.tryParse('aaaaa');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 5
            }
        });

        r = repeated.tryParse('aaaaaa');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                position: 5
            }
        });
    });

    it('should RepeatParserErrorMessagesAreReadable', () => {
        const repeated = Parse.char('a').repeat(4, 5);

        expect(() => repeated.parse('aaa'))
            .toThrow("Parsing failure: Unexpected 'end of input'; expected 'a' between 4 and 5 times, but found 3");
    });

    it('should RepeatExactlyParserErrorMessagesAreReadable', () => {
        const repeated = Parse.char('a').repeat(4);

        expect(() => repeated.parse('aaa'))
            .toThrow("Parsing failure: Unexpected 'end of input'; expected 'a' 4 times, but found 3");
    });

    it('should CanParseSequence', () => {
        const sequence = Parse.char('a').delimitedBy(Parse.char(','));
        const r = sequence.tryParse('a,a,a');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                atEnd: true
            }
        });
    });

    it('should FailGracefullyOnSequence', () => {
        const sequence = Parse.char('a').xDelimitedBy(Parse.char(','));
        AssertParser.FailsWith(sequence, 'a,a,b', result => {
            expect(result).toMatchObject({
                message: expect.stringContaining("unexpected 'b'"),
                expectations: expect.arrayContaining([
                    'a'
                ])
            });
        });
    });

    it('should CanParseContained', () => {
        const parser = Parse.char('a').contained(
            Parse.char('['),
            Parse.char(']')
        );
        const r = parser.tryParse('[a]');

        expect(r).toMatchObject({
            wasSuccessful: true,
            remainder: {
                atEnd: true
            }
        });
    });
});
