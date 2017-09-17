export interface IInput {
    source: string;
    current: string;
    atEnd: boolean;
    position: number;
    line: number;
    column: number;
    memos: Map<any, any>;

    advance(): IInput;
    isEqual(otherInput: Input): boolean;
}

export class Input implements IInput {
    memos: Map<any, any> = new Map<any, any>();

    constructor(
        public source: string,
        public position: number = 0,
        public line: number = 1,
        public column: number = 1) {
    }

    get atEnd() {
        return this.position === this.source.length;
    }

    isEqual(otherInput: Input) {
        return this.source === otherInput.source && this.position === otherInput.position;
    }

    get current() {
        return this.source.charAt(this.position);
    }

    advance(distance: number = 1) {
        if (this.atEnd) {
            throw new Error("Already at the end of the stream, can't advance()");
        }

        const current = this.current;

        const newLineNumber = current === '\n' ? this.line + 1 : this.line;
        const newColumnNumber = current === '\n' ? 1 : this.column + distance;

        return new Input(this.source, this.position + distance, newLineNumber, newColumnNumber);
    }
}
