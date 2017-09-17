import { BaseError } from 'make-error';
import { FailureResult } from './result';

export class ParseError<T> extends BaseError {
    constructor(public parseResult: FailureResult<T>) {
        super(`Parsing Error: (${parseResult.remainder!.line}:${parseResult.remainder!.column}): ${parseResult.message}, expected: ${parseResult.expectations!.join(', ')}`);
    }
}
