import { Parse, Parser, Input, IInput, Result } from 'sprache';
import { AssertInput } from './assertInput.util';

describe('inputs', () => {
    beforeAll(() => {
        expect.hasAssertions();
    });

    it('should InputsOnTheSameString_AtTheSamePosition_AreEqual', () => {
        const s = 'Nada';
        const p = 2;
        const i1 = new Input(s, p);
        const i2 = new Input(s, p);
        expect(i1).toStrictEqual(i2);
    });

    it('should InputsOnTheSameString_AtDifferentPositions_AreNotEqual', () => {
        const s = 'Nada';
        const i1 = new Input(s, 1);
        const i2 = new Input(s, 2);
        expect(i1).not.toBe(i2);
        // assert.isTrue(i1 !== i2);  // can't override == in JS like you can in C#
    });

    it('should InputsOnDifferentStrings_AtTheSamePosition_AreNotEqual', () => {
        const p = 2;
        const i1 = new Input('Algo', p);
        const i2 = new Input('Nada', p);
        expect(i1).not.toBe(i2);
    });

    it('should InputsAtEnd_CannotAdvance', () => {
        const i = new Input('', 0);
        expect(i.atEnd).toBe(true);
        expect(() => i.advance()).toThrow();
    });

    it('should AdvancingInput_MovesForwardOneCharacter', () => {
        const i = new Input('abc', 1);
        const j = i.advance();
        expect(j.position).toBe(2);
    });

    it('should CurrentCharacter_ReflectsPosition', () => {
        const i = new Input('abc', 1);
        expect(i.current).toBe('b');
    });

    it('should ANewInput_WillBeAtFirstCharacter', () => {
        const i = new Input('abc');
        expect(i.position).toBe(0);
    });

    it('should AdvancingInput_IncreasesColumnNumber', () => {
        const i = new Input('abc', 1);
        const j = i.advance();
        expect(j.column).toBe(2);
    });

    it('should AdvancingInputAtEOL_IncreasesLineNumber', () => {
        const i = new Input('\nabc');
        const j = i.advance();
        expect(j.line).toBe(2);
    });

    it('should AdvancingInputAtEOL_ResetsColumnNumber', () => {
        const i = new Input('\nabc');
        const j = i.advance();

        expect(j.line).toBe(2);
        expect(j.column).toBe(1);
    });

    it('should LineCountingSmokeTest', () => {
        let i: IInput = new Input('abc\ndef');
        expect(i.position).toBe(0);
        expect(i.line).toBe(1);
        expect(i.column).toBe(1);

        i = AssertInput.AdvanceAssert(i, (a, b) => {
            expect(b.position).toBe(1);
            expect(b.line).toBe(1);
            expect(b.column).toBe(2);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            expect(b.position).toBe(2);
            expect(b.line).toBe(1);
            expect(b.column).toBe(3);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            expect(b.position).toBe(3);
            expect(b.line).toBe(1);
            expect(b.column).toBe(4);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            expect(b.position).toBe(4);
            expect(b.line).toBe(2);
            expect(b.column).toBe(1);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            expect(b.position).toBe(5);
            expect(b.line).toBe(2);
            expect(b.column).toBe(2);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            expect(b.position).toBe(6);
            expect(b.line).toBe(2);
            expect(b.column).toBe(3);
        });
    });
});
