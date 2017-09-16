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

    return i => {
        if (!i.atEnd) {
            if (predicate(i.current)) {

                return Result.Success(i.current, i.advance());
            }

            return Result.Failure<string>(i, `Unexpected ${i.current}`, [ description ]);
        }

        return Result.Failure<string>(i, "Unexpected end of input reached", [ description ]);
    };
}

const Parse = {

    Char: ParseChar,
    WhiteSpace: ParseChar(c => / /.test(c), "whitespace"),

    many<T>(parser: Parser<T>): Parser<T[]> {
        if (!parser) {
            throw new Error("parser missing");
        }

        return i => {
            let remainder = i;
            const result: T[] = [];
            let r = parser(i);

            while (r.wasSuccessful) {
                if (remainder.isEqual(r.remainder)) {
                    break;
                }

                result.push(r.value!);
                remainder = r.remainder;
                r = parser(remainder);
            }

            return Result.Success(result, remainder);
        };
    },

    token<T>(parser: Parser<T>): Parser<T> {
        return sequence(function*() {
            yield Parse.many(Parse.WhiteSpace);

            const item = yield parser;

            yield Parse.many(Parse.WhiteSpace);

            return item;
        });
    }
};

function sequence<T, U>(generator: () => Iterator<Parser<T>>): Parser<any> {
    return (input: IInput) => {

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
            return Result.Success(nextParser, input);
        }

        return result!;
    };
}

function nextSequenceStep<T>({ iterator, result }: { iterator: Iterator<Parser<T>>, result: Result<T>}) {
    if (result && !result.wasSuccessful) {
        return iterator.return!("ERROR 43!!!");
    } else {
        return iterator.next(result ? result.value! : undefined);
    }
}

function or<T, U>(generator: () => Iterator<Parser<T>>): Parser<any> {
    return (input: IInput) => {

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
            return Result.Success(nextParser, input);
        }

        return result!;
    };
}

function nextOrStep<T>({ iterator, result }: { iterator: Iterator<Parser<T>>, result: Result<T>}) {
    if (result && result.wasSuccessful) {
        return iterator.return!(result.value);
    } else {
        return iterator.next(result ? result.value! : undefined);
    }
}

type Parser<T> = (input: IInput) => Result<T>;
type Predicate<T> = (input: T) => boolean;

const Letter = Parse.Char(c => /[a-zA-Z]/.test(c), "A letter");
const Digit = Parse.Char(c => /[0-9]/.test(c), "A number");

const DigitOrLetter = or(function*() {
    yield Digit;
    yield Letter;
});

const IntegerLiteral = Parse.token(Parse.many(Digit));

const AssignmentRHS = or(function*() {
    yield Identifier;
    yield IntegerLiteral;
});

const Assignment = sequence(function*() {
    const name = yield Identifier;

    yield Parse.Char('=', 'Equals Sign');

    const value = yield AssignmentRHS;

    return { type: 'assignment', name, value } as any;
});

const Identifier = Parse.token(sequence(function*() {
    const letter = yield Letter;
    const rest = yield Parse.many(DigitOrLetter);

    return [letter].concat(rest).join('') as any;
}));

function testInput(inputString: string) {
    const result = Assignment(new Input(inputString));

    if (result.wasSuccessful) {
        console.log("Result: ", JSON.stringify(result.value, null, '  '));
    } else {
        console.error(`Parsing Error: (${result.remainder!.line}:${result.remainder!.column}): ${result.message}, expected: ${result.expectations!.join(', ')}`);
    }
}

// testInput("ab");
// testInput("a");
// testInput("3");
// testInput("d5");
// testInput("-");
testInput(" df =    2342   ");
// testInput("d=w");
// testInput("d==");
