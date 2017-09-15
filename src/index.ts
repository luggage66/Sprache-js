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
    remainder?: IInput;
    expectations?: string[];
    value?: T;

    constructor(private wasSuccessful: boolean) {
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

// function Success<T>(value: T, remainder: IInput): ISuccessResult<T>  {
//     return {
//         successful: true,
//         value,
//         remainder,
//         message: undefined,
//         expectations: undefined
//     };
// }

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

// interface Parser<T> {
//     (input: IInput): IResult<T>;
// }

class Parser<T> {
    constructor(private fn: (input: IInput) => Result<T>) {
    }

    parse(input: IInput) {
        return this.fn(input);
    }

    Then<U>(second: (_: T) => Parser<U>): Parser<U> {
        if (!second) {
            throw new Error("no second parser in Then()");
        }

        return new Parser((i) => {
            return this.parse(i).ifSuccess(s => second(s.value).parse(s.remainder));
        });
    }
}

type Predicate<T> = (input: T) => boolean;

const Parse = {
    Char(charOrPredicate: string | Predicate<string>, description: string) {
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

        return new Parser(i => {
            if (!i.atEnd) {
                if (predicate(i.current)) {

                    return Result.Success(i.current, i.advance());
                }

                return Result.Failure(i, `Unexpected ${i.current}`, [ description ]);
            }

            return Result.Failure(i, "Unexpected end of input reached", [ description ]);
        });
    }
};

let foo = Parse.Char('a', 'A');
let result = foo.parse(new Input("a"));

console.log(result);
