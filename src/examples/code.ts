import { Parse } from 'sprache';

const IntegerLiteral = Parse.digit.atLeastOnce().text().select(str => Number(str));

const ArithmeticOperation = Parse.query(function*() {
    const lhs       = yield IntegerLiteral.token();
    const operator  = yield Parse.chars('+-/*');
    const rhs       = yield IntegerLiteral.token();

    return Parse.return({
        $type: "arithmetic",
        operator,
        lhs,
        rhs
    });
});

const ast = ArithmeticOperation.parse("3+42");
console.log(JSON.stringify(ast, null, '  '));
