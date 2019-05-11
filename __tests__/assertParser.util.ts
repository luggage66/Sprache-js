import { Result } from '../src/result';
import { Parse, Parser } from '../src/parse';
import { SuccessResult } from '../src/result';

export class AssertParser {
    public static SucceedsWithOne<T>(
        parser: Parser<T[]>,
        input: string,
        expectedResult: T
    ): void {
        AssertParser.SucceedsWith(parser, input, t => {
            expect(t.length).toBe(1);
            expect(t[0]).toBe(expectedResult);
        });
    }

    public static SucceedsWithMany<T>(
        parser: Parser<T[]>,
        input: string,
        expectedResult: T[]
    ): void {
        AssertParser.SucceedsWith(parser, input, t =>
            expect(t).toStrictEqual(expectedResult)
        );
    }

    public static SucceedsWithAll(
        parser: Parser<string[]>,
        input: string
    ): void {
        AssertParser.SucceedsWithMany(parser, input, input.split(''));
    }

    public static SucceedsWith<T>(
        parser: Parser<T>,
        input: string,
        resultAssertion: (_: T) => void
    ): void {
        parser
            .tryParse<T>(input)
            .ifFailure(f => {
                expect.fail(`Parsing of "input" failed unexpectedly. ${f}`);
                return f;
            })
            .ifSuccess(s => {
                resultAssertion(s.value as T);
                return s;
            });
    }

    public static Succeeds<T>(
        parser: Parser<T>,
        input: string,
        resultAssertion: (_: SuccessResult<T>) => void
    ): void {
        parser
            .tryParse<T>(input)
            .ifFailure(f => {
                expect.fail(`Parsing of "input" failed unexpectedly. ${f}`);
                return f;
            })
            .ifSuccess(s => {
                resultAssertion(s as any);
                return s;
            });
    }

    public static Fails<T>(parser: Parser<T>, input: string): void {
        AssertParser.FailsWith(parser, input, f => undefined);
    }

    public static FailsAt<T>(
        parser: Parser<T>,
        input: string,
        position: number
    ): void {
        AssertParser.FailsWith(parser, input, f =>
            expect(position).toBe(f.remainder.position)
        );
    }

    public static FailsWith<T>(
        parser: Parser<T>,
        input: string,
        resultAssertion: (_: Result<T>) => void
    ): void {
        parser
            .tryParse(input)
            .ifSuccess(s => {
                expect.fail(`Expected failure but succeeded with ${s.value}.`);
                return s;
            })
            .ifFailure(f => {
                resultAssertion(f as Result<T>);
                return f;
            });
    }
}
