import 'mocha';
import { Parse, Parser } from '../src/parse';
import { Input, IInput } from '../src/input';
import { Result } from '../src/result';
import { expect, assert } from 'chai';
import { AssertParser } from './assertParser';
import { AssertInput } from './assertInput';

describe('inputs', () => {
    it('should InputsOnTheSameString_AtTheSamePosition_AreEqual', () => {
        const s = "Nada";
        const p = 2;
        const i1 = new Input(s, p);
        const i2 = new Input(s, p);
        assert(i1.isEqual(i2));
        // assert.isTrue(i1 === i2); // can't override == in JS like you can in C#
    });

    it('should InputsOnTheSameString_AtDifferentPositions_AreNotEqual', () => {
        const s = "Nada";
        const i1 = new Input(s, 1);
        const i2 = new Input(s, 2);
        assert.isFalse(i1.isEqual(i2));
        // assert.isTrue(i1 !== i2);  // can't override == in JS like you can in C#
    });

    it('should InputsOnDifferentStrings_AtTheSamePosition_AreNotEqual', () => {
        const p = 2;
        const i1 = new Input("Algo", p);
        const i2 = new Input("Nada", p);
        assert.notEqual(i1, i2);
    });

    it('should InputsAtEnd_CannotAdvance', () => {
        const i = new Input("", 0);
        assert.isTrue(i.atEnd);
        assert.throws(() => i.advance());
    });

    it('should AdvancingInput_MovesForwardOneCharacter', () => {
        const i = new Input("abc", 1);
        const j = i.advance();
        assert.equal(2, j.position);
    });

    it('should CurrentCharacter_ReflectsPosition', () => {
        const i = new Input("abc", 1);
        assert.equal('b', i.current);
    });

    it('should ANewInput_WillBeAtFirstCharacter', () => {
        const i = new Input("abc");
        assert.equal(0, i.position);
    });

    it('should AdvancingInput_IncreasesColumnNumber', () => {
        const i = new Input("abc", 1);
        const j = i.advance();
        assert.equal(2, j.column);
    });

    it('should AdvancingInputAtEOL_IncreasesLineNumber', () => {
        const i = new Input("\nabc");
        const j = i.advance();
        assert.equal(2, j.line);
    });

    it('should AdvancingInputAtEOL_ResetsColumnNumber', () => {
        const i = new Input("\nabc");
        const j = i.advance();
        assert.equal(2, j.line);
        assert.equal(1, j.column);
    });

    it('should LineCountingSmokeTest', () => {
        let i: IInput = new Input("abc\ndef");
        assert.equal(0, i.position);
        assert.equal(1, i.line);
        assert.equal(1, i.column);

        i = AssertInput.AdvanceAssert(i, (a, b) => {
            assert.equal(1, b.position);
            assert.equal(1, b.line);
            assert.equal(2, b.column);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            assert.equal(2, b.position);
            assert.equal(1, b.line);
            assert.equal(3, b.column);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            assert.equal(3, b.position);
            assert.equal(1, b.line);
            assert.equal(4, b.column);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            assert.equal(4, b.position);
            assert.equal(2, b.line);
            assert.equal(1, b.column);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            assert.equal(5, b.position);
            assert.equal(2, b.line);
            assert.equal(2, b.column);
        });
        i = AssertInput.AdvanceAssert(i, (a, b) => {
            assert.equal(6, b.position);
            assert.equal(2, b.line);
            assert.equal(3, b.column);
        });
    });
});
