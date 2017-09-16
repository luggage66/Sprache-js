import { Result } from '../result';
import { Parse, Parser, ParserHelpers } from '../parse';
import { IInput } from '../input';

const Letter = Parse.char(c => /[a-zA-Z]/.test(c), "A letter");
const Digit = Parse.char(c => /[0-9]/.test(c), "A number");

const DigitOrLetter = Parse.queryOr<string>(function*() {
    yield Digit;
    yield Letter;
});

const LiteralToken = (word: string) => Parse.query(function*() {
    for (const letter of word) {
        yield Parse.char(letter, letter);
    }

    return Parse.return(word);
});

const SeparatedList = (separator: string, parser: Parser<any>) => Parse.query(function*() {
    const firstItem = yield parser;
    const rest = yield Parse.query(function*() {
        yield Parse.char(separator, separator);
        const item = yield parser;

        return Parse.return(item);
    }).many();

    return Parse.return([firstItem].concat(rest));
});

const Identifier = Parse.query(function*() {
    const letter = yield Letter;
    const rest = yield DigitOrLetter.many();

    return Parse.return([letter].concat(rest)).text() as any;
}).token();

const Comparison = Parse.query(function*() {
    const lhs = yield Identifier;

    yield Parse.char('=', 'Equals Sign');

    const rhs = yield Identifier;

    return Parse.return({
        $type: 'COMPARISON',
        lhs,
        rhs
    });
});

const SelectClause = Parse.query(function*() {
    yield LiteralToken("SELECT");

    const columns = yield SeparatedList(',', Identifier);

    return Parse.return({
        $type: "SELECT_CLAUSE",
        columns
    });
});

const FromClause = Parse.query(function*() {
    yield LiteralToken("FROM");

    const tableName = yield Identifier;

    return Parse.return({
        $type: 'FROM_CLAUSE',
        tableName
    });
});

const WhereClause = Parse.query(function*() {
    yield LiteralToken("WHERE");

    const conditions = yield Comparison.many();

    return Parse.return({
        $type: 'WHERE_CLAUSE',
        conditions
    });
});

interface SelectStatement {
    statement: string;
}
const SelectStatement = Parse.query(function*() {
    const select = yield SelectClause;
    const from = yield FromClause;
    const where = yield WhereClause;

    return Parse.return({
        statement: 'select',
        select,
        from,
        where
    });
});

export {SelectStatement};
