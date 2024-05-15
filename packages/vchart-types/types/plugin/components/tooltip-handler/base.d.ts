import type { Options } from './constants';
import type { Maybe, ILayoutPoint, RenderMode } from '../../../typings';
import type { TooltipData, ITooltipActual, TooltipActiveType, ITooltipHandler, ITooltipPositionActual } from '../../../typings/tooltip';
import type { IGroup } from '@visactor/vrender-core';
import type { Compiler } from '../../../compile/compiler';
import type { IContainerSize } from '@visactor/vrender-components';
import type { IChartOption } from '../../../chart/interface';
import type { ITooltipSpec, Tooltip, TooltipHandlerParams } from '../../../component/tooltip';
import { TooltipResult } from '../../../component/tooltip';
import type { IComponentPlugin, IComponentPluginService } from '../interface';
import { BasePlugin } from '../../base/base-plugin';
import type { ITooltipAttributes } from './interface';
type ChangeTooltipFunc = (visible: boolean, params: TooltipHandlerParams, data?: TooltipData) => TooltipResult;
type ChangeTooltipPositionFunc = (params: TooltipHandlerParams, data: TooltipData) => TooltipResult;
export declare abstract class BaseTooltipHandler extends BasePlugin implements ITooltipHandler, IComponentPlugin {
    static readonly pluginType: 'component';
    static readonly specKey = "tooltip";
    readonly type: string;
    protected _visible: boolean;
    protected _option: Options;
    protected _chartOption: IChartOption;
    protected _env: RenderMode;
    get env(): "desktop-browser" | "mobile-browser" | "node" | "worker" | "miniApp" | "wx" | "tt" | "harmony" | "desktop-miniApp" | "lynx";
    protected _component: Tooltip;
    protected _attributes?: ITooltipAttributes | null;
    protected _chartContainer: Maybe<HTMLElement>;
    protected _compiler: Compiler;
    protected _isTooltipPaused: boolean;
    protected _isPointerEscaped: boolean;
    protected _cachePointerTimer: number;
    protected _cachePointerPosition: ILayoutPoint;
    protected _cacheTooltipPosition: ILayoutPoint;
    protected _cacheTooltipSize: IContainerSize;
    protected _container: Maybe<IGroup | HTMLElement>;
    protected _isReleased: boolean;
    onAdd(service: IComponentPluginService<any>): void;
    showTooltip: (activeType: TooltipActiveType, data: TooltipData, params: TooltipHandlerParams) => TooltipResult;
    protected changeTooltip: ChangeTooltipFunc;
    protected _changeTooltip: ChangeTooltipFunc;
    protected changeTooltipPosition: ChangeTooltipPositionFunc;
    protected _changeTooltipPosition: ChangeTooltipPositionFunc;
    hideTooltip(params: TooltipHandlerParams): TooltipResult;
    release(): void;
    protected _clearAllCache(): void;
    protected abstract _updateTooltip(visible: boolean, params: TooltipHandlerParams): void;
    protected abstract _removeTooltip(): void;
    protected _throttle(callback: any): (...args: unknown[]) => unknown;
    protected _getDefaultOption(): Options;
    protected _getActualTooltipPosition: (actualTooltip: ITooltipActual, params: TooltipHandlerParams, tooltipBoxSize: IContainerSize | undefined) => ITooltipPositionActual;
    protected _getTooltipBoxSize(actualTooltip: ITooltipActual, changePositionOnly: boolean): IContainerSize | undefined;
    protected _getPointerPositionRelativeToTooltipParent(params: TooltipHandlerParams): {
        x: any;
        y: any;
    };
    protected _isPointerMovingToTooltip(params: TooltipHandlerParams): boolean;
    protected _getParentElement(spec: ITooltipSpec): HTMLElement;
    getTooltipContainer(): HTMLElement | IGroup;
    protected _initFromSpec(): void;
    reInit(): void;
}
export {};
