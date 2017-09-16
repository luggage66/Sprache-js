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
    tryParse<T>(input: string): Result<T>;
    parse<T>(input: string): T;
}

const helpers: ParserHelpers = {
    tryParse<T>(this: Parser<T>, input: string): Result<T> {
        return this(new Input(input));
    },
    parse<T>(this: Parser<T>, input: string): T {
        const result = this(new Input(input));

        if (result.wasSuccessful) {
            return result.value!;
        }

        // tslint:disable-next-line:max-line-length
        throw new Error(`Parsing Error: (${result.remainder!.line}:${result.remainder!.column}): ${result.message}, expected: ${result.expectations!.join(', ')}`);
    },
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

            return Parse.return(item);
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
    WhiteSpace: ParseChar(c => / /.test(c), "whitespace"),
    return<T>(value: T): Parser<T> {
        return MakeParser(i => Result.Success(value, i));
    }
};

interface MyIterator<T, U> {
    next(value?: T): IteratorResult<T>;
    return?(value?: T): IteratorResult<T>;
    throw?(e?: any): IteratorResult<T>;
}

export function sequence<T, U>(generator: () => IterableIterator<Parser<T>>): Parser<U> {
    return MakeParser((input: IInput) => {

        const iterator = generator();

        // Loop state
        let result: Result<U | T>;
        let nextParser: Parser<T>;
        let done = false;

        do {
            const nextStep = nextSequenceStep({ iterator, result: result! as Result<T> });

            nextParser = nextStep.value as Parser<T>; // You yield Parser<T>'s and return U's
            done = nextStep.done;

            result = nextParser(input);
            input = result!.remainder;
        } while (!done);

        return result! as Result<U>;
    });
}

function nextSequenceStep<T>({ iterator, result }: { iterator: IterableIterator<Parser<T>>, result: Result<T>}) {
    if (result && !result.wasSuccessful) {
        return iterator.return!(Parse.return("ERROR 4323441!!"));
    } else {
        return iterator.next(result ? result.value! : undefined);
    }
}

export function or<U>(generator: () => IterableIterator<Parser<any>>): Parser<U> {
    return MakeParser((input: IInput) => {

        const iterator = generator();

        // Loop state
        let result: Result<any>;
        let nextParser: Parser<any>;
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
            return Result.Success(nextParser as Parser<U>, input);
        }

        if (!result!) {
            throw Error("Error empty-or?");
        }

        return result! as any;
    });
}

function nextOrStep<T>({ iterator, result }: { iterator: IterableIterator<Parser<T>>, result: Result<T>}) {
    if (result && result.wasSuccessful) {
        return iterator.return!(result.value);
    } else {
        return iterator.next(result ? result.value! : undefined);
    }
}

export { Parse };
