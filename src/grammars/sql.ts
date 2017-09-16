import { Result } from '../result';
import { Parse, Parser, sequence, or, ParserHelpers } from '../engine';
import { IInput } from '../input';

const Letter = Parse.Char(c => /[a-zA-Z]/.test(c), "A letter");
const Digit = Parse.Char(c => /[0-9]/.test(c), "A number");

const DigitOrLetter = or(function*() {
    yield Digit;
    yield Letter;
});

const LiteralToken = (word: string) => sequence(function*() {
    for (const letter of word) {
        yield Parse.Char(letter, letter);
    }

    return word as any;
});

const SeparatedList = (separator: string, parser: Parser<any>) => sequence(function*() {
    const firstItem = yield parser;
    const rest = yield sequence(function*() {
        yield Parse.Char(separator, separator);
        const item = yield parser;

        return item;
    }).many();

    return [firstItem].concat(rest) as any;
});

const Identifier = sequence(function*() {
    const letter = yield Letter;
    const rest = yield DigitOrLetter.many();

    return [letter].concat(rest).join('') as any;
}).token();

const Comparison = sequence(function*() {
    const lhs = yield Identifier;

    yield Parse.Char('=', 'Equals Sign');

    const rhs = yield Identifier;

    return {
        $type: 'COMPARISON',
        lhs,
        rhs
    } as any;
});

const SelectClause = sequence(function*() {
    yield LiteralToken("SELECT");

    const columns = yield SeparatedList(',', Identifier);

    return {
        $type: "SELECT_CLAUSE",
        columns
    } as any;
});

const FromClause = sequence(function*() {
    yield LiteralToken("FROM");

    const tableName = yield Identifier;

    return {
        $type: 'FROM_CLAUSE',
        tableName
    } as any;
});

const WhereClause = sequence(function*() {
    yield LiteralToken("WHERE");

    const conditions = yield Comparison.many();

    return {
        $type: 'WHERE_CLAUSE',
        conditions
    } as any;
});

const SelectStatement = sequence(function*() {
    const select = yield SelectClause;
    const from = yield FromClause;
    const where = yield WhereClause;

    return {
        statement: 'select',
        select,
        from,
        where
    } as any;
});

export {SelectStatement};
