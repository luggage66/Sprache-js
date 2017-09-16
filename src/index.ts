interface IInput {
    source: string;
    current: string;
    atEnd: boolean;
    position: number;
    line: number;
    column: number;

    advance(): IInput;
}

class Input implements IInput {
    constructor(
        public source: string,
        public position: number = 0,
        public line: number = 1,
        public column: number = 1) {
    }

    get atEnd() {
        return this.position === this.source.length;
    }

    isEqual(otherInput: Input) {
        return this.source === otherInput.source && this.position === otherInput.position;
    }

    get current() {
        return this.source.charAt(this.position);
    }

    advance(distance: number = 1) {
        if (this.atEnd) {
            throw new Error("Already at the end of the stream, can't advance()");
        }

        const current = this.current;

        const newLineNumber = current === '\n' ? this.line + 1 : this.line;
        const newColumnNumber = current === '\n' ? 1 : this.column + distance;

        return new Input(this.source, this.position + distance, newLineNumber, newColumnNumber);
    }
}

class Result<T> {
    static Success<T>(value: T, remainder: IInput): SuccessResult<T> {
        return new SuccessResult<T>(value, remainder);
    }

    static Failure<T>(remainder: IInput, message: string, expectations: string[]): FailureResult<T> {
        return new FailureResult<T>(remainder, message, expectations);
    }

    message?: string;
    remainder: IInput;
    expectations?: string[];
    value?: T;

    constructor(public wasSuccessful: boolean) {
    }

    ifSuccess<U>(next: (foo: SuccessResult<T>) => Result<U>): Result<U> {
        if (this.wasSuccessful) {
            return next(this as SuccessResult<T>);
        }

        const { remainder, message, expectations } = this as FailureResult<T>;

        return Result.Failure(remainder, message, expectations);
    }
}

class SuccessResult<T> extends Result<T> {
    constructor(public value: T, public remainder: IInput) {
        super(true);
    }
}

class FailureResult<T> extends Result<T> {
    constructor(public remainder: IInput, public message: string, public expectations: string[]) {
        super(false);
    }
}

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

function sequence<T, U>(generator: () => Iterator<Parser<T>>): Parser<any> {
    return (input: IInput) => {

        const iterator = generator();

        // Loop state
        let result: Result<T>;
        let nextParser: Parser<T>;
        let done = false;

        do {
            const foo = { iterator, result: result! };

            // console.log(nextParser!, done, result);

            ({ value: nextParser, done } = nextSequenceStep({ iterator, result: result! }));

            // console.log(nextParser!, done, result);

            if (!done) {
                result = nextParser(input);
            }
            input = result!.remainder;
        } while (!done);

        console.log(result);

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

            // console.log(nextParser!, done, result);

            ({ value: nextParser, done } = nextOrStep({ iterator, result: result! }));

            // console.log(nextParser!, done, result);

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

function Char(charOrPredicate: string | Predicate<string>, description: string): Parser<string> {
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

type Predicate<T> = (input: T) => boolean;

const LetterToken = Char(c => /[a-zA-Z]/.test(c), "A letter");
const NumberToken = Char(c => /[0-9]/.test(c), "A number");

const Grammar = sequence(function*() {
    const letter = yield LetterToken;
    yield Char('=', 'Equals Sign');
    const numberOrLetter = yield or(function*() {
        yield NumberToken;
        yield LetterToken;
    });

    return { letter, numberOrLetter } as any;
});

function testInput(inputString: string) {
    const result = Grammar(new Input(inputString));

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
testInput("d=5");
testInput("d=w");
testInput("d==");
