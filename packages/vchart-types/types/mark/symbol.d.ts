import type { ISymbolMarkSpec } from '../typings/visual';
import { BaseMark } from './base/base-mark';
import type { IMarkStyle, ISymbolMark } from './interface';
import { MarkTypeEnum } from './interface/type';
export declare class BaseSymbolMark<T extends ISymbolMarkSpec> extends BaseMark<T> {
    protected _getDefaultStyle(): IMarkStyle<T>;
}
export declare class SymbolMark extends BaseSymbolMark<ISymbolMarkSpec> implements ISymbolMark {
    static readonly type = MarkTypeEnum.symbol;
    readonly type = MarkTypeEnum.symbol;
}
export declare const registerSymbolMark: () => void;
