import { IInput, Input } from '../src/input';

export class AssertInput {
    static AdvanceMany(input: IInput, count: number): IInput {

        for (let i = 0; i < count; i++) {
            input = input.advance();
        }

        return input;
    }

    static AdvanceAssert(input: IInput, assertion: (_1: IInput, _2: IInput) => void): IInput {
        const result = input.advance();
        assertion(input, result);
        return result;
    }

    public static AdvanceManyAssert(input: Input, count: number, assertion: (_1: IInput, _2: IInput) => void): IInput {
        const result = AssertInput.AdvanceMany(input, count);
        assertion(input, result);
        return result;
    }
}
