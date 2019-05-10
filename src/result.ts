import { IInput } from './input';

export class Result<T> {
    static Success<T>(value: T, remainder: IInput): SuccessResult<T> {
        return new SuccessResult<T>(value, remainder);
    }

    static Failure<T>(remainder: IInput, message: string, expectations: string[]): FailureResult<T> {
        return new FailureResult<T>(remainder, message, expectations);
    }

    message?: string;
    remainder!: IInput;
    expectations!: string[];
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

    ifFailure<U>(next: (foo: FailureResult<U>) => Result<any>): Result<U> {
        const result = this;

        return (result.wasSuccessful ? result : next(result as FailureResult<any>)) as Result<U>;
    }

    toString() {
        if (this.wasSuccessful) {
            return `Successful parsing of ${this.value}.`;
        }

        let expMsg = "";

        if (this.expectations.length) {
            expMsg = " expected " + this.expectations.reduce((e1, e2) => e1 + " or " + e2);
        }

        const recentlyConsumed = this.calculateRecentlyConsumed();

        return `Parsing failure: ${this.message};${expMsg} (${this.remainder}); recently consumed: ${recentlyConsumed}`;
    }

    private calculateRecentlyConsumed(): string {
        const windowSize = 10;

        const totalConsumedChars = this.remainder.position;
        let windowStart = totalConsumedChars - windowSize;
        windowStart = windowStart < 0 ? 0 : windowStart;

        const numberOfRecentlyConsumedChars = totalConsumedChars - windowStart;

        return this.remainder.source.substr(windowStart, numberOfRecentlyConsumedChars);
    }
}

export class SuccessResult<T> extends Result<T> {
    expectations: string[] = [];
    constructor(public value: T, public remainder: IInput) {
        super(true);
    }
}

export class FailureResult<T> extends Result<T> {
    constructor(public remainder: IInput, public message: string, public expectations: string[]) {
        super(false);
    }
}
