import type { IMark } from '../../mark/interface';
import { CartesianSeries } from '../cartesian/cartesian';
import type { SeriesMarkMap } from '../interface';
import { SeriesTypeEnum } from '../interface/type';
import type { ITreemapSeriesSpec } from './interface';
import type { PanEventParam, ZoomEventParam } from '../../event/interface';
import { DataView } from '@visactor/vdataset';
import type { ILabelMark } from '../../mark/label';
import { TreemapSeriesSpecTransformer } from './treemap-transform';
export declare class TreemapSeries extends CartesianSeries<any> {
    static readonly type: string;
    type: SeriesTypeEnum;
    static readonly mark: SeriesMarkMap;
    static readonly transformerConstructor: typeof TreemapSeriesSpecTransformer;
    readonly transformerConstructor: typeof TreemapSeriesSpecTransformer;
    private _leafMark;
    private _nonLeafMark;
    private _labelMark;
    private _nonLeafLabelMark;
    protected _spec: ITreemapSeriesSpec;
    protected _categoryField: string;
    getCategoryField(): string;
    setCategoryField(f: string): string;
    protected _valueField: string;
    getValueField(): string;
    setValueField(f: string): string;
    private _maxDepth;
    private _matrix;
    private _viewBox;
    private _enableAnimationHook;
    setAttrFromSpec(): void;
    initData(): void;
    compile(): void;
    protected _runTreemapTransform(render?: boolean): void;
    protected _addDataIndexAndKey(): void;
    getRawDataStatisticsByField(field: string, isNumeric?: boolean): any;
    protected _createHierarchyDataStatistics(dataName: string, rawData: DataView[]): DataView;
    getStatisticFields(): {
        key: string;
        operations: import("../../data/transforms/dimension-statistics").StatisticOperations;
    }[];
    initMark(): void;
    initMarkStyle(): void;
    protected _initLeafMarkStyle(): void;
    protected _initNonLeafMarkStyle(): void;
    initLabelMarkStyle(labelMark: ILabelMark): void;
    protected initNonLeafLabelMarkStyle(labelMark: ILabelMark): void;
    initAnimation(): void;
    protected initEvent(): void;
    protected _getDataIdKey(): string;
    protected initTooltip(): void;
    private _shouldFilterElement;
    handlePan(event: PanEventParam): void;
    handleZoom(event: ZoomEventParam): void;
    getDimensionField(): string[];
    getMeasureField(): string[];
    onLayoutEnd(ctx: any): void;
    protected enableMarkAnimation(): void;
    protected disableMarkAnimation(): void;
    getDefaultShapeType(): string;
    getActiveMarks(): IMark[];
    isHierarchyData: () => boolean;
}
export declare const registerTreemapSeries: () => void;
