import { Result, FailureResult, SuccessResult } from './result';
import { IInput, Input } from './input';
import { Parse, or, sequence } from './engine';

const Letter = Parse.Char(c => /[a-zA-Z]/.test(c), "A letter");
const Digit = Parse.Char(c => /[0-9]/.test(c), "A number");

const DigitOrLetter = or(function*() {
    yield Digit;
    yield Letter;
});

const IntegerLiteral = Digit.many().token();

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

const Identifier = sequence(function*() {
    const letter = yield Letter;
    const rest = yield DigitOrLetter.many();

    return [letter].concat(rest).join('') as any;
}).token();

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
testInput(" df =    dsfs   ");
// testInput("d=w");
// testInput("d==");
