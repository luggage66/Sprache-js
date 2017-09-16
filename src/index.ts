import { Result, FailureResult, SuccessResult } from './result';
import { IInput, Input } from './input';
import { Parse, Parser } from './parse';
import { SelectStatement } from './grammars/sql';

const Letter = Parse.char(c => /[a-zA-Z]/.test(c), "A letter");
const Digit = Parse.char(c => /[0-9]/.test(c), "A number");

const DigitOrLetter = Parse.queryOr(function*() {
    yield Digit;
    yield Letter;
});

const IntegerLiteral = Digit.many().token();

const Expression = Parse.queryOr(function*() {
    yield Identifier;
    yield IntegerLiteral;
});

const Assignment = Parse.query(function*() {
    const lhs = yield Identifier;

    yield Parse.char('=', 'Equals Sign');

    const rhs = yield Expression;

    return Parse.return({ type: 'assignment', lhs, rhs });
});

const Identifier = Parse.query(function*() {
    const letter = yield Letter;
    const rest = yield DigitOrLetter.many();

    return Parse.return([letter].concat(rest)).text() as any;
}).token();

function testInput(inputString: string) {
    const result = SelectStatement.tryParse(inputString);

    if (result.wasSuccessful) {
        console.log("Result: ", JSON.stringify(result.value, null, '  '));
    } else {
        console.error(`Parsing Error: (${result.remainder!.line}:${result.remainder!.column}): ${result.message}, expected: ${result.expectations!.join(', ')}`);
    }
}

// testInput("SELECT foo1, bar2, baz FROM myTable WHERE a = b");
// testInput("ab");
// testInput("a");
// testInput("3");
// testInput("d5");
// testInput("-");
// testInput(" df =    dsfs   ");
// testInput("d");
// testInput("d==");

const identifier: Parser<string> = Parse.query(function*() {
    const leading = yield Parse.whiteSpace.many();
    const first = yield Parse.letter.once();
    const rest = yield Parse.letterOrDigit.many();
    const trailing = yield Parse.whiteSpace.many();
    return Parse.return([first].concat(rest).join('')) as any;
});

const id = identifier.tryParse(" abc123  ");

console.log(id);
