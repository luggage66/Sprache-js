
import { Parse, Parser, Input, IInput, Result } from 'sprache';

const Environment  = {
    NewLine: '\n'
};

describe('Scenerio: CSV', () => {

    const CellSeparator = Parse.char(',');

    const QuotedCellDelimiter = Parse.char('"');

    const QuoteEscape = Parse.char('"');

    function Escaped<T>(following: Parser<T>): Parser<T> {
        return Parse.query(function*() {
               const escape = yield QuoteEscape;
               const f = yield following;
               return Parse.return(f);
        });
    }

    const QuotedCellContent =
        Parse.anyChar.except(QuotedCellDelimiter).or(Escaped(QuotedCellDelimiter));

    const LiteralCellContent =
        Parse.anyChar.except(CellSeparator).except(Parse.string(Environment.NewLine));

    const QuotedCell = Parse.query<string>(function*() {
        const open = yield QuotedCellDelimiter;
        const content = yield QuotedCellContent.many().text();
        const end = yield QuotedCellDelimiter;
        return Parse.return(content);
    });

    const NewLine =
        Parse.string(Environment.NewLine).text();

    const RecordTerminator =
        Parse.return("").end().xOr(
        NewLine.end()).or(
        NewLine);

    const Cell =
        QuotedCell.xOr(
        LiteralCellContent.xMany().text());

    const Record = Parse.query<string[]>(function*() {
        const leading = yield Cell;
        const rest = yield CellSeparator.then(_ => Cell).many();
        const terminator = yield RecordTerminator;
        return Parse.return([leading].concat(rest));
    });

    // string[][]
    const Csv =
        Record.xMany().end();

    it('ParsesSimpleList', () => {
        const input = "a,b";
        const r = Csv.parse(input);
        expect(r.length).toBe(1);

        expect(r.length).toBeGreaterThan

        const l1 = r[0];
        expect(l1.length).toBe(2);
        expect(l1[0]).toBe("a");
        expect(l1[1]).toBe("b");
    });

    it('ParsesListWithEmptyEnding', () => {
        const input = "a,b,";
        const r = Csv.parse(input);
        assert.equal(1, r.length);

        const l1 = r[0] || assert.fail('Expected at least one item');
        assert.equal(3, l1.length);
        assert.equal("a", l1[0]);
        assert.equal("b", l1[1]);
        assert.equal("", l1[2]);
    });

    it('ParsesListWithNewlineEnding', () => {
        const input = "a,b," + Environment.NewLine;
        const r = Csv.parse(input);
        assert.equal(1, r.length);

        const l1 = r[0] || assert.fail('Expected at least one item');
        assert.equal(3, l1.length);
        assert.equal("a", l1[0]);
        assert.equal("b", l1[1]);
        assert.equal("", l1[2]);
    });

    it('ParsesLines', () => {
        const input = "a,b,c" + Environment.NewLine + "d,e,f";
        const r = Csv.parse(input);
        assert.equal(2, r.length);

        const l1 = r[0] || assert.fail('Expected at least one item');
        assert.equal(3, l1.length);
        assert.equal("a", l1[0]);
        assert.equal("b", l1[1]);
        assert.equal("c", l1[2]);

        const l2 = r[1] || assert.fail('Expected a second line');
        assert.equal(3, l2.length);
        assert.equal("d", l2[0]);
        assert.equal("e", l2[1]);
        assert.equal("f", l2[2]);
    });

    it('IgnoresTrailingNewline', () => {
        const input = "a,b,c" + Environment.NewLine + "d,e,f" + Environment.NewLine;
        const r = Csv.parse(input);
        assert.equal(2, r.length);
    });

    it('IgnoresCommasInQuotedCells', () => {
        const input = "a,\"b,c\"";
        const r = Csv.parse(input);
        const first = r[0] || assert.fail('Expected at least one item');
        assert.equal(2, first.length);
    });

    it('RecognisesDoubledQuotesAsSingleLiteral', () => {
        const input = "a,\"b\"\"c\"";
        const r = Csv.parse(input);
        const first = r[0] || assert.fail('Expected at least one item');
        assert.equal("b\"c", first[1]);
    });

    it('AllowsNewLinesInQuotedCells', () => {
        const input = "a,b,\"c" + Environment.NewLine + "d\"";
        const r = Csv.parse(input);
        assert.equal(1, r.length);
    });

    it('IgnoresEmbeddedQuotesWhenNotFirstCharacter', () => {
        const input = "a\"b";
        const r = Csv.parse(input);
        const firstRow = r[0] || assert.fail('Expected at least one item');
        assert.equal("a\"b", firstRow[0] || assert.fail('Expected at least one item'));
    });
});
