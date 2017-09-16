import { Result, FailureResult, SuccessResult } from './result';
import { IInput, Input } from './input';

function DetermineBestError(firstFailure: FailureResult<any>, secondFailure: FailureResult<any>) {
    if (secondFailure.remainder.position > firstFailure.remainder.position) {
        return secondFailure;
    }

    if (secondFailure.remainder.position === firstFailure.remainder.position) {
        return Result.Failure(
            firstFailure.remainder,
            firstFailure.message,
            firstFailure.expectations.concat(secondFailure.expectations)
        );
    }

    return firstFailure;
}

export type ParserFunction<T> = (input: IInput) => Result<T>;
type Predicate<T> = (input: T) => boolean;

export interface ParserHelpers {
    many<T>(): Parser<T[]>;
    token<T>(): Parser<T>;
}

const helpers: ParserHelpers = {
    many<T>(this: Parser<T>): Parser<T[]> {
        if (!this) {
            throw new Error("parser missing");
        }

        return MakeParser(i => {
            let remainder = i;
            const result: T[] = [];
            let r = this(i);

            while (r.wasSuccessful) {
                if (remainder.isEqual(r.remainder)) {
                    break;
                }

                result.push(r.value!);
                remainder = r.remainder;
                r = this(remainder);
            }

            return Result.Success(result, remainder);
        });
    },
    token<T>(this: Parser<T>): Parser<T> {
        const parser = this;
        return sequence(function*() {
            yield Parse.WhiteSpace.many();

            const item = yield parser;

            yield Parse.WhiteSpace.many();

            return item;
        });
    }
};

export type Parser<T> = ParserFunction<T> & ParserHelpers;

function MakeParser<T>(fn: ParserFunction<T>): Parser<T> {
    return Object.assign(fn, helpers);
}

function ParseChar(charOrPredicate: string | Predicate<string>, description: string): Parser<string> {
    if (!charOrPredicate) { throw new Error("charOrPredicate missing"); }
    if (!description) { throw new Error("description missing"); }

    let predicate: Predicate<string>;

    // if they give us a character, turn that into a predicate
    if (typeof(charOrPredicate) !== 'function') {
        const char = charOrPredicate;
        predicate = (c) => c === char;
    } else {
        predicate = charOrPredicate;
    }

    return MakeParser(i => {
        if (!i.atEnd) {
            if (predicate(i.current)) {

                return Result.Success(i.current, i.advance());
            }

            return Result.Failure<string>(i, `Unexpected ${i.current}`, [ description ]);
        }

        return Result.Failure<string>(i, "Unexpected end of input reached", [ description ]);
    });
}

const Parse = {
    Char: ParseChar,
    WhiteSpace: ParseChar(c => / /.test(c), "whitespace")
};

export function sequence<T, U>(generator: () => Iterator<Parser<T>>): Parser<any> {
    return MakeParser((input: IInput) => {

        const iterator = generator();

        // Loop state
        let result: Result<T>;
        let nextParser: Parser<T>;
        let done = false;

        do {

            ({ value: nextParser, done } = nextSequenceStep({ iterator, result: result! }));

            if (!done) {
                result = nextParser(input);
            }
            input = result!.remainder;
        } while (!done);

        if (result!.wasSuccessful) {
            return Result.Success(nextParser as any, input);
        }

        return result!;
    });
}

function nextSequenceStep<T>({ iterator, result }: { iterator: Iterator<Parser<T>>, result: Result<T>}) {
    if (result && !result.wasSuccessful) {
        return iterator.return!("ERROR 43!!!");
    } else {
        return iterator.next(result ? result.value! : undefined);
    }
}

export function or<T, U>(generator: () => Iterator<Parser<T>>): Parser<any> {
    return MakeParser((input: IInput) => {

        const iterator = generator();

        // Loop state
        let result: Result<T>;
        let nextParser: Parser<T>;
        let done = false;

        do {
            const foo = { iterator, result: result! };

            ({ value: nextParser, done } = nextOrStep({ iterator, result: result! }));

            if (!done) {
                result = nextParser(input);
            }
            input = result!.remainder;
        } while (!done);

        if (result!.wasSuccessful) {
            return Result.Success(nextParser as any, input);
        }

        return result!;
    });
}

function nextOrStep<T>({ iterator, result }: { iterator: Iterator<Parser<T>>, result: Result<T>}) {
    if (result && result.wasSuccessful) {
        return iterator.return!(result.value);
    } else {
        return iterator.next(result ? result.value! : undefined);
    }
}

export { Parse };
