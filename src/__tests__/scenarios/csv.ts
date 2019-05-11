import { Parse, Parser, Input, IInput, Result } from '../../';
import 'jest-extended';

const Environment = {
    NewLine: '\n'
};

describe('Example: CSV', () => {
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

    const QuotedCellContent = Parse.anyChar
        .except(QuotedCellDelimiter)
        .or(Escaped(QuotedCellDelimiter));

    const LiteralCellContent = Parse.anyChar
        .except(CellSeparator)
        .except(Parse.string(Environment.NewLine));

    const QuotedCell = Parse.query<string>(function*() {
        const open = yield QuotedCellDelimiter;
        const content = yield QuotedCellContent.many().text();
        const end = yield QuotedCellDelimiter;
        return Parse.return(content);
    });

    const NewLine = Parse.string(Environment.NewLine).text();

    const RecordTerminator = Parse.return('')
        .end()
        .xOr(NewLine.end())
        .or(NewLine);

    const Cell = QuotedCell.xOr(LiteralCellContent.xMany().text());

    const Record = Parse.query<string[]>(function*() {
        const leading = yield Cell;
        const rest = yield CellSeparator.then(_ => Cell).many();
        const terminator = yield RecordTerminator;
        return Parse.return([leading].concat(rest));
    });

    // string[][]
    const Csv = Record.xMany().end();

    it('ParsesSimpleList', () => {
        const input = 'a,b';
        const r = Csv.parse(input);
        expect(r.length).toBe(1);

        expect(Csv.parse(input)).toMatchInlineSnapshot(`
            Array [
              Array [
                "a",
                "b",
              ],
            ]
        `);
    });

    it('ParsesListWithEmptyEnding', () => {
        const input = 'a,b,';
        const r = Csv.parse(input);

        expect(Csv.parse(input)).toMatchInlineSnapshot(`
            Array [
              Array [
                "a",
                "b",
                "",
              ],
            ]
        `);
    });

    it('ParsesListWithNewlineEnding', () => {
        const input = 'a,b,' + Environment.NewLine;

        expect(Csv.parse(input)).toMatchInlineSnapshot(`
            Array [
              Array [
                "a",
                "b",
                "",
              ],
            ]
        `);
    });

    it('ParsesLines', () => {
        const input = 'a,b,c' + Environment.NewLine + 'd,e,f';

        expect(Csv.parse(input)).toMatchInlineSnapshot(`
            Array [
              Array [
                "a",
                "b",
                "c",
              ],
              Array [
                "d",
                "e",
                "f",
              ],
            ]
        `);
    });

    it('IgnoresTrailingNewline', () => {
        const input =
            'a,b,c' + Environment.NewLine + 'd,e,f' + Environment.NewLine;

        expect(Csv.parse(input)).toBeArrayOfSize(2);
    });

    it('IgnoresCommasInQuotedCells', () => {
        const input = 'a,"b,c"';

        expect(Csv.parse(input)).toMatchInlineSnapshot(`
            Array [
              Array [
                "a",
                "b,c",
              ],
            ]
        `);
    });

    it('RecognisesDoubledQuotesAsSingleLiteral', () => {
        const input = 'a,"b""c"';

        expect(Csv.parse(input)).toMatchInlineSnapshot(`
            Array [
              Array [
                "a",
                "b\\"c",
              ],
            ]
        `);
    });

    it('AllowsNewLinesInQuotedCells', () => {
        const input = 'a,b,"c' + Environment.NewLine + 'd"';

        expect(Csv.parse(input)).toMatchInlineSnapshot(`
            Array [
              Array [
                "a",
                "b",
                "c
            d",
              ],
            ]
        `);
    });

    it('IgnoresEmbeddedQuotesWhenNotFirstCharacter', () => {
        const input = 'a"b';

        expect(Csv.parse(input)).toMatchInlineSnapshot(`
            Array [
              Array [
                "a\\"b",
              ],
            ]
        `);
    });
});
