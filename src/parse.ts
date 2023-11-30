import { Result, FailureResult, SuccessResult } from './result';
import { IInput, Input } from './input';
import { ParseError } from './errors';

function DetermineBestError(
    firstFailure: FailureResult<any>,
    secondFailure: FailureResult<any>
) {
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

/**
 * The signature of every undecorated parser.
 */
export type ParserFunction<T> = (input: IInput) => Result<T>;
type Predicate<T> = (input: T) => boolean;

export interface ParserHelpers {
    tryParse<T>(this: Parser<T>, input: string): Result<T>;
    parse<T>(this: Parser<T>, input: string): T;
}

export interface ParserApi {
    many<T>(this: Parser<T>): Parser<T[]>;
    token<T>(this: Parser<T>): Parser<T>;

    concat<T>(this: Parser<T[]>, second: Parser<T[]>): Parser<T[]>;
    select<T, U>(this: Parser<T>, convert: (_: T) => U): Parser<U>;
    then<T, U>(this: Parser<T>, second: (_: T) => Parser<U>): Parser<U>;
    once<T>(this: Parser<T>): Parser<T[]>;
    or<T, U>(this: Parser<T>, second: Parser<U>): Parser<T | U>;
    xOr<T>(this: Parser<T>, second: Parser<T>): Parser<T>;
    xMany<T>(this: Parser<T>): Parser<T[]>;
    not<T>(this: Parser<T>): Parser<any>;

    atLeastOnce<T>(this: Parser<T>): Parser<T[]>;
    optional<T>(this: Parser<T>): Parser<T | undefined>;
    xOptional<T>(this: Parser<T>): Parser<T | undefined>;

    text(this: Parser<string[]>): Parser<string>;
    named<T>(this: Parser<T>, name: string): Parser<T>;
    end<T>(this: Parser<T>): Parser<T>;

    delimitedBy<T, U>(this: Parser<T>, delimiter: Parser<U>): Parser<T[]>;
    xDelimitedBy<T, U>(this: Parser<T>, delimiter: Parser<U>): Parser<T[]>;
    repeat<T>(
        this: Parser<T>,
        minimumCount: number,
        maximumCount?: number
    ): Parser<T[]>;

    contained<T, U, V>(
        this: Parser<T>,
        open: Parser<U>,
        close: Parser<V>
    ): Parser<T>;

    until<T, U>(this: Parser<T>, until: Parser<U>): Parser<T[]>;
    return<T, U>(this: Parser<T>, value: U): Parser<U>;
    except<T, U>(this: Parser<T>, except: Parser<U>): Parser<T>;
    xAtLeastOnce<T>(this: Parser<T>): Parser<T[]>;
}

const parserFunctions: ParserHelpers & ParserApi = {
    tryParse<T>(this: Parser<T>, input: string): Result<T> {
        return this(new Input(input));
    },

    parse<T>(this: Parser<T>, input: string): T {
        const result = this(new Input(input));

        if (result.wasSuccessful) {
            return result.value!;
        }

        // tslint:disable-next-line:max-line-length
        throw new ParseError(result.toString());
    },

    many<T>(this: Parser<T>): Parser<T[]> {
        if (!this) {
            throw new Error('parser missing');
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
        return Parse.query(function* () {
            yield Parse.whiteSpace.many();

            const item = yield parser;

            yield Parse.whiteSpace.many();

            return Parse.return(item);
        });
    },

    concat<T>(this: Parser<T[]>, second: Parser<T[]>): Parser<T[]> {
        const first = this;

        return first.then(f => second.select(f.concat));
    },

    select<T, U>(this: Parser<T>, convert: (_: T) => U): Parser<U> {
        const parser = this;

        return parser.then(t => Parse.return(convert(t)));
    },

    then<T, U>(this: Parser<T>, second: (_: T) => Parser<U>): Parser<U> {
        const first = this;

        return MakeParser(i =>
            first(i).ifSuccess(s => second(s.value)(s.remainder))
        );
    },

    once<T>(this: Parser<T>): Parser<T[]> {
        const parser = this;

        return parser.select((r: T) => [r]);
    },

    or<T, U>(this: Parser<T>, second: Parser<U>): Parser<T | U> {
        const first = this;

        return MakeParser(i => {
            const fr = first(i);
            if (!fr.wasSuccessful) {
                return second(i).ifFailure(sf =>
                    DetermineBestError(
                        fr as FailureResult<T>,
                        sf as FailureResult<T>
                    )
                );
            }

            if (fr.remainder.isEqual(i)) {
                return second(i).ifFailure(sf => fr);
            }

            return fr;
        });
    },

    xOr<T>(this: Parser<T>, second: Parser<T>): Parser<T> {
        const first = this;

        return MakeParser(i => {
            const fr = first(i);
            if (!fr.wasSuccessful) {
                // The 'X' part
                if (!fr.remainder.isEqual(i)) {
                    return fr;
                }

                return second(i).ifFailure(sf =>
                    DetermineBestError(fr as FailureResult<T>, sf)
                );
            }

            // This handles a zero-length successful application of first.
            if (fr.remainder.isEqual(i)) {
                return second(i).ifFailure(sf => fr);
            }

            return fr;
        });
    },

    text(this: Parser<string[]>): Parser<string> {
        const characters = this;
        return characters.select((chs: string[]) => chs.join(''));
    },

    named<T>(this: Parser<T>, name: string): Parser<T> {
        const parser = this;

        return MakeParser(i =>
            parser(i).ifFailure(f =>
                f.remainder.isEqual(i)
                    ? Result.Failure<T>(f.remainder, f.message, [name])
                    : f
            )
        );
    },

    atLeastOnce<T>(this: Parser<T>): Parser<T[]> {
        const parser = this;

        return parser
            .once()
            .then((t1: T[]) =>
                parser.many().select((ts: T[]) => t1.concat(ts))
            );
    },

    optional<T>(this: Parser<T>): Parser<T | undefined> {
        const parser = this;

        return MakeParser(i => {
            const pr = parser(i);

            if (pr.wasSuccessful) {
                return Result.Success(pr.value, pr.remainder);
            }

            return Result.Success(undefined, i);
        });
    },

    xOptional<T>(this: Parser<T>): Parser<T | undefined> {
        const parser = this;

        return MakeParser(i => {
            const pr = parser(i);

            if (pr.wasSuccessful) {
                return Result.Success(pr.value, pr.remainder);
            }

            if (pr.remainder.isEqual(i)) {
                return Result.Success(undefined, i);
            }

            return Result.Failure(pr.remainder, pr.message!, pr.expectations);
        });
    },

    end<T>(this: Parser<T>): Parser<T> {
        const parser = this;

        return MakeParser(i =>
            parser(i).ifSuccess(s =>
                s.remainder.atEnd
                    ? s
                    : Result.Failure<T>(
                        s.remainder,
                        `unexpected '${s.remainder.current}'`,
                        ['end of input']
                    )
            )
        );
    },

    delimitedBy<T, U>(this: Parser<T>, delimiter: Parser<U>): Parser<T[]> {
        const parser = this;

        return Parse.query(function* () {
            const head = (yield parser.once()) as unknown as T[];
            const tail = (yield Parse.query(function* () {
                const separator = yield delimiter;
                const item = yield parser;
                return Parse.return(item);
            }).many()) as unknown as T;
            return Parse.return(head.concat(tail));
        });
    },

    xDelimitedBy<T, U>(this: Parser<T>, delimiter: Parser<U>): Parser<T[]> {
        const itemParser = this;

        return Parse.query(function* () {
            const head = (yield itemParser.once()) as unknown as T[];
            const tail = (yield Parse.query(function* () {
                const separator = yield delimiter;
                const item = yield itemParser;
                return Parse.return(item);
            }).xMany()) as unknown as T;
            return Parse.return(head.concat(tail));
        });
    },

    repeat<T>(
        this: Parser<T>,
        minimumCount: number,
        maximumCount: number = minimumCount
    ): Parser<T[]> {
        const parser = this;

        return MakeParser(i => {
            let remainder = i;
            const result = [];

            for (let n = 0; n < maximumCount; ++n) {
                const r = parser(remainder);

                if (!r.wasSuccessful && n < minimumCount) {
                    const what = r.remainder.atEnd
                        ? 'end of input'
                        : r.remainder.current.toString();

                    const msg = `Unexpected '${what}'`;
                    let exp: string
                    if (minimumCount === maximumCount) {
                        exp = `'${r.expectations!.join(
                            ', '
                        )}' ${minimumCount} times, but found ${n}`;
                    }
                    else {
                        exp = `'${r.expectations!.join(
                            ', '
                        )}' between ${minimumCount} and ${maximumCount} times, but found ${n}`;
                    }

                    return Result.Failure<T[]>(i, msg, [exp]);
                }

                if (!(remainder === r.remainder)) {
                    result.push(r.value!);
                }

                remainder = r.remainder;
            }

            return Result.Success<T[]>(result, remainder);
        });
    },

    contained<T, U, V>(
        this: Parser<T>,
        open: Parser<U>,
        close: Parser<V>
    ): Parser<T> {
        const parser = this;

        return Parse.query(function* () {
            const o = yield open;
            const item = yield parser;
            const c = yield close;
            return Parse.return(item);
        });
    },

    xMany<T>(this: Parser<T>): Parser<T[]> {
        const parser = this;

        return parser
            .many()
            .then((m: T[]) => parser.once().xOr(Parse.return(m)));
    },

    not<T>(this: Parser<T>): Parser<any> {
        const parser = this;

        return MakeParser(i => {
            const result = parser(i);

            if (result.wasSuccessful) {
                const msg = `${result.expectations!.join(
                    ', '
                )}' was not expected`;
                return Result.Failure<object>(i, msg, []);
            }
            return Result.Success<any>(null, i);
        });
    },
    until<T, U>(this: Parser<T>, until: Parser<U>): Parser<T[]> {
        const parser = this;
        return parser
            .except(until)
            .many()
            .then((r: T[]) => until.return(r));
    },
    return<T, U>(this: Parser<T>, value: U): Parser<U> {
        const parser = this;
        return parser.select(t => value);
    },
    except<T, U>(this: Parser<T>, except: Parser<U>): Parser<T> {
        const parser = this;

        // Could be more like: except.Then(s => s.Fail("..")).XOr(parser)
        return MakeParser(i => {
            const r = except(i);
            if (r.wasSuccessful) {
                return Result.Failure<T>(i, 'Excepted parser succeeded.', [
                    'other than the excepted input'
                ]);
            }
            return parser(i);
        });
    },
    xAtLeastOnce<T>(this: Parser<T>): Parser<T[]> {
        const parser = this;

        return parser
            .once()
            .then((t1: T[]) =>
                parser.xMany().select((ts: T[]) => t1.concat(ts))
            );
    }
};

export type Parser<T> = ParserFunction<T> & ParserHelpers & ParserApi;

/**
 * Turn a function into a parser. This assigns functions like .tryParse() and .atLeastOnce(), etc.
 * @param fn The parse function to wrap/decorate
 */
export function MakeParser<T>(fn: ParserFunction<T>): Parser<T> {
    return Object.assign(fn, parserFunctions);
}

function ParseChar(
    charOrPredicate: string | Predicate<string>,
    description?: string
): Parser<string> {
    if (!charOrPredicate) {
        throw new Error('charOrPredicate missing');
    }

    let predicate: Predicate<string>;

    // if they give us a character, turn that into a predicate
    if (typeof charOrPredicate !== 'function') {
        const char = charOrPredicate;
        predicate = c => c === char;
        if (!description) {
            description = char;
        }
    } else {
        predicate = charOrPredicate;
    }

    if (!description) {
        throw new Error('description missing');
    }

    return MakeParser(i => {
        if (!i.atEnd) {
            if (predicate(i.current)) {
                return Result.Success(i.current, i.advance());
            }

            return Result.Failure<string>(i, `unexpected '${i.current}'`, [
                description!
            ]);
        }

        return Result.Failure<string>(i, 'Unexpected end of input reached', [
            description!
        ]);
    });
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes
function String_prototype_includes(
    this: string,
    search: string,
    start?: number
) {
    if (typeof start !== 'number') {
        start = 0;
    }

    if (start + search.length > this.length) {
        return false;
    } else {
        return this.indexOf(search, start) !== -1;
    }
}

const Parse = {
    char: ParseChar,
    chars(...c: string[]) {
        let listToMatch: string | string[] = c;

        if (c.length === 1 && c[0].length > 1) {
            listToMatch = c[0];
        }

        return ParseChar(
            (listToMatch.includes || String_prototype_includes).bind(c),
            c.join('|')
        );
    },
    whiteSpace: ParseChar(c => / /.test(c), 'whitespace'),
    letter: ParseChar(c => /[a-zA-Z]/.test(c), 'a letter'),
    letterOrDigit: ParseChar(c => /[a-zA-Z0-9]/.test(c), 'a letter or digit'),
    digit: ParseChar(c => /[0-9]/.test(c), 'a digit'),
    anyChar: ParseChar(() => true, 'any character'),
    ignoreCase: (word: string) =>
        Parse.query<string[]>(function* () {
            const foundChars = [];

            for (const letter of word) {
                foundChars.push(
                    yield Parse.char(
                        ch => letter.toLowerCase() === ch.toLowerCase(),
                        letter
                    )
                );
            }

            return Parse.return(foundChars);
        }),
    string: (word: string) =>
        Parse.query<string[]>(function* () {
            const foundChars = [];

            for (const letter of word) {
                foundChars.push(yield Parse.char(letter, letter));
            }

            return Parse.return(foundChars);
        }),
    return<T>(value: T): Parser<T> {
        return MakeParser(i => Result.Success(value, i));
    },

    query<U>(
        generator: () => IterableIterator<Parser<any>>,
        message?: string
    ): Parser<U> {
        return MakeParser((input: IInput) => {
            const iterator = generator();

            // Loop state
            let result: Result<any>;
            let nextParser: Parser<any>;
            let done : boolean | undefined = false;

            do {
                const nextStep = nextSequenceStep({
                    iterator,
                    result: result!
                });

                nextParser = nextStep.value; // You yield Parser<T>'s and return U's
                done = nextStep.done;

                result = nextParser(input);
                input = result!.remainder;
            } while (!done);

            return result! as Result<U>;
        });
    },

    queryOr<U>(
        generator: () => IterableIterator<Parser<any>>,
        message?: string
    ): Parser<U> {
        return MakeParser((input: IInput) => {
            const iterator = generator();

            // Loop state
            let result: Result<any> | undefined = undefined;
            let nextParser: Parser<any>;
            let done: boolean | undefined = false;

            do {
                ({ value: nextParser, done } = nextOrStep(iterator, result));

                if (!done) {
                    result = nextParser(input);
                }
            } while (!done);

            if (result!.wasSuccessful) {
                input = result!.remainder;
                return Result.Success(nextParser as Parser<any>, input);
            }

            if (!result!) {
                throw Error('Error empty-or?');
            }

            return result! as any;
        });
    },

    ref<T>(reference: () => Parser<T>): Parser<T> {
        if (reference == null) {
            throw new Error('argument reference null');
        }

        let p: Parser<T>;

        return MakeParser(i => {
            if (!p) {
                p = reference();
            }

            if (i.memos.has(p)) {
                throw new ParseError(i.memos.get(p).toString());
            }

            i.memos.set(
                p,
                Result.Failure<T>(i, 'Left recursion in the grammar.', [])
            );
            const result = p(i);
            i.memos.set(p, result);
            return result;
        });
    },

    regex(regex: string | RegExp, description?: string): Parser<string> {
        if (regex == null) {
            throw new Error('missing pattern');
        }

        if (!(regex instanceof RegExp)) {
            regex = new RegExp(regex);
        }

        return Parse.regexMatch(regex, description).then(match =>
            Parse.return(match[0])
        );
    },

    regexMatch(
        regex: string | RegExp,
        description?: string
    ): Parser<RegExpExecArray> {
        if (regex == null) {
            throw new Error('missing pattern');
        }

        if (!(regex instanceof RegExp)) {
            regex = new RegExp(regex);
        }

        const regexString = regex.toString();

        // modify regexp to look for the string at the beginning of the current remainder
        const lastIndexOfRegex = regexString.lastIndexOf('/');
        regex = new RegExp(
            `^(?:${regexString.slice(1, lastIndexOfRegex)})`,
            regexString.slice(lastIndexOfRegex + 1, regexString.length)
        );

        const expectations = description == null ? [] : [description];

        return MakeParser(i => {
            if (!i.atEnd) {
                let remainder = i;
                const input = i.source.substr(i.position);
                const match = (regex as RegExp).exec(input);

                if (match) {
                    remainder = remainder.advance(match[0].length);

                    return Result.Success(match, remainder);
                }

                // const found = match!.index === input.length
                //                 ? "end of source"
                //                 : `\`${input[match!.index]}'`;

                const found = input[0];

                return Result.Failure<RegExpExecArray>(
                    remainder,
                    'string matching regex `' +
                    regex +
                    "' expected but " +
                    found +
                    ' found',
                    expectations
                );
            }

            return Result.Failure<RegExpExecArray>(
                i,
                'Unexpected end of input',
                expectations
            );
        });
    }
};

function nextSequenceStep<T>({
    iterator,
    result
}: {
    iterator: Iterator<Parser<T>, any, unknown>;
    result: Result<T>;
}) {
    if (result && !result.wasSuccessful) {
        return iterator.return!(MakeParser(i => result));
    } else {
        return iterator.next(result ? result.value! : undefined);
    }
}

function nextOrStep<T>(
    iterator: Iterator<Parser<T>, any, unknown>,
    result?: Result<T>
): IteratorResult<Parser<T>> {
    if (result && result.wasSuccessful) {
        return iterator.return!(result.value);
    } else {
        return iterator.next(result ? result.value! : undefined);
    }
}

export { Parse };
