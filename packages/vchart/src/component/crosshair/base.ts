import type { Dict, IBoundsLike } from '@visactor/vutils';
// eslint-disable-next-line no-duplicate-imports
import { throttle, PointService, isEqual, isArray, isNumber, get, isBoolean, isObject, array } from '@visactor/vutils';
import { RenderModeEnum } from '../../typings/spec/common';
import type { BaseEventParams, EventType } from '../../event/interface';
import type { IModelLayoutOption, IModelRenderOption } from '../../model/interface';
import type { IRegion } from '../../region/interface';
import { BaseComponent } from '../base/base-component';
import type { IPadding, Maybe, StringOrNumber, TooltipActiveType, TooltipData } from '../../typings';
import { outOfBounds } from '../../util/math';
import type { IComponentOption } from '../interface';
import type {
  ICrossHair,
  CrossHairTrigger,
  ICartesianCrosshairSpec,
  IPolarCrosshairSpec,
  ICrosshairCategoryFieldSpec
} from './interface';
import { ChartEvent, Event_Bubble_Level, Event_Source_Type } from '../../constant/event';
import { LayoutZIndex } from '../../constant/layout';
import { getDefaultCrosshairTriggerEventByMode } from './config';
import type { IPolarAxis } from '../axis/polar/interface';
import type { IAxis } from '../axis/interface';
import type { TooltipEventParams } from '../tooltip/interface/event';

export type IBound = { x1: number; y1: number; x2: number; y2: number };
export type IAxisInfo<T> = Map<number, IBound & { axis: T }>;

export interface IHair {
  /** 是否展示 crosshair 辅助图形 */
  visible: boolean;
  /** 类型 */
  type: 'rect' | 'line';
  /** 样式 */
  style?: Dict<any>;
  label?: {
    /** 文本是否可见 */
    visible: boolean;
    /** 格式化函数 */
    formatMethod?: (text: StringOrNumber | string[], position: string) => string | string[];
    /**
     * 格式化模板
     * @description 可以通过类似 `{value:.2f}%` 的形式对指定数据字段进行格式化
     * @since 1.10.0
     */
    formatter?: string | string[];
    /** 文本样式 */
    textStyle?: Dict<any>;
    minWidth?: number;
    maxWidth?: number;
    padding?: IPadding | number | number[];
    panel?: Dict<any>;
    zIndex?: number;
  };
}

export interface IHairRadius extends IHair {
  smooth?: boolean;
}

const ORIENT_MAP = {
  x: ['top', 'bottom'],
  y: ['left', 'right'],
  category: ['angle'],
  value: ['radius']
};

export abstract class BaseCrossHair<T extends ICartesianCrosshairSpec | IPolarCrosshairSpec>
  extends BaseComponent<T>
  implements ICrossHair
{
  static specKey = 'crosshair';
  specKey = 'crosshair';

  layoutType: 'none' = 'none';
  gridZIndex: number = LayoutZIndex.CrossHair_Grid;
  labelZIndex: number = LayoutZIndex.CrossHair;
  trigger: CrossHairTrigger = 'hover';
  enable: boolean;
  showDefault: boolean;
  triggerOff: 'none' | number; // 为none则不消失

  private _timer?: number;
  private _clickLock?: boolean;
  private _hasActive?: boolean;
  private _onlyLockClick?: boolean;

  get enableRemain(): boolean {
    return this.triggerOff === 'none';
  }

  private _limitBounds: Maybe<IBoundsLike>;

  constructor(spec: T, options: IComponentOption) {
    super(spec, options);
    this.enable = true;
    this.showDefault = true;
  }

  protected abstract _showDefaultCrosshairBySpec(): void;
  protected abstract _layoutCrosshair(
    x: number,
    y: number,
    tooltipData?: TooltipData,
    activeType?: TooltipActiveType
  ): void;
  protected abstract _parseFieldInfo(): void;
  abstract hide(): void;

  protected _getLimitBounds() {
    if (!this._limitBounds) {
      const { width, height } = this._option.globalInstance.getChart()?.getViewRect() ?? {
        width: 0,
        height: 0
      };
      this._limitBounds = {
        x1: 0,
        y1: 0,
        x2: width,
        y2: height
      };
    }
    return this._limitBounds;
  }

  protected _showDefaultCrosshair() {
    if (!this.showDefault) {
      return;
    }

    this._showDefaultCrosshairBySpec();
  }

  setAttrFromSpec() {
    super.setAttrFromSpec();
    this._parseCrosshairSpec();
  }

  created() {
    super.created();
    // event
    this._initEvent();
  }

  /**
   * updateSpec
   */
  _compareSpec(spec: T, prevSpec: T) {
    const result = super._compareSpec(spec, prevSpec);
    if (!result.reMake && !isEqual(prevSpec, spec)) {
      result.reRender = true;
      result.reMake = true;
    }
    return result;
  }

  protected _initEvent() {
    if (this._option.disableTriggerEvent) {
      return;
    }

    if (this._spec.followTooltip) {
      this._registerTooltipEvent();
    } else {
      const triggerConfig = this._getTriggerEvent();

      if (triggerConfig) {
        triggerConfig.forEach(cfg => {
          this._registerEvent(cfg.in, false, cfg.click);
          cfg.out && this._registerEvent(cfg.out, true);
        });
      }
    }
  }

  private _registerEvent(eventName: EventType | EventType[], isOut?: boolean, click?: boolean) {
    const handler = isOut ? this._handleOutEvent : click ? this._handleClickInEvent : this._handleHoverInEvent;
    const cfg = isOut ? { level: Event_Bubble_Level.chart } : { source: Event_Source_Type.chart };

    if (isArray(eventName)) {
      (eventName as EventType[]).forEach(evt => {
        this.event.on(evt, cfg, handler);
      });
    } else {
      this.event.on(eventName as EventType, cfg, handler);
    }
  }

  private _eventOff(eventName: EventType | EventType[], isOut?: boolean, click?: boolean) {
    const handler = isOut ? this._handleOutEvent : click ? this._handleClickInEvent : this._handleHoverInEvent;
    if (isArray(eventName)) {
      (eventName as EventType[]).forEach(evt => {
        this.event.off(evt, handler);
      });
    } else {
      this.event.off(eventName as EventType, handler);
    }
  }

  updateLayoutAttribute() {
    this._limitBounds = null;
    this._showDefaultCrosshair();
  }

  protected calculateTriggerPoint(params: any) {
    const { event } = params as BaseEventParams;
    // compute layer offset
    const layer = this._option.getCompiler().getStage().getLayer(undefined);
    const point = { x: event.viewX, y: event.viewY };
    layer.globalTransMatrix.transformPoint({ x: event.viewX, y: event.viewY }, point);

    return {
      x: point.x - this.getLayoutStartPoint().x,
      y: point.y - this.getLayoutStartPoint().y
    };
  }

  private _handleIn = (params: any) => {
    if (!this._option) {
      return;
    }

    const { x, y } = this.calculateTriggerPoint(params);
    this.showDefault = false;
    this._layoutCrosshair(x, y);

    const components = this._getNeedClearVRenderComponents();
    this._hasActive = components.some(comp => comp && comp.attribute.visible !== false);
  };

  private _handleClickInEvent = (params: any) => {
    if (this._hasActive && this._spec.lockAfterClick && !this._clickLock) {
      this._clickLock = true;
      return;
    } else if (this._clickLock) {
      this._clickLock = false;
      this._handleOutEvent();
      return;
    }

    if (this._onlyLockClick) {
      return;
    }

    this._handleIn(params);

    if (isNumber(this.triggerOff)) {
      if (this._timer) {
        clearTimeout(this._timer);
      }

      this._timer = setTimeout(() => {
        this._handleOutEvent();
      }, this.triggerOff as number) as unknown as number;
    }
  };

  private _handleHoverInEvent = throttle((params: any) => {
    if (this._clickLock) {
      return;
    }

    this._handleIn(params);
  }, 10);

  private _handleOutEvent = () => {
    if (this.enableRemain || this._clickLock || !this._hasActive) {
      return;
    }
    this.clearOutEvent();

    this.hide();
  };

  private _getTriggerEvent() {
    const { mode = RenderModeEnum['desktop-browser'] } = this._option;
    const triggerConfig = getDefaultCrosshairTriggerEventByMode(mode);
    if (triggerConfig) {
      const trigger: string[] = array(this.trigger || 'hover');
      const outTrigger = (inTrigger: CrossHairTrigger) => {
        if (inTrigger === 'click') {
          return this.triggerOff === 'none' ? null : triggerConfig.clickOut;
        }
        return triggerConfig.hoverOut;
      };

      if (this._spec.lockAfterClick && !trigger.includes('click')) {
        trigger.push('click');
        this._onlyLockClick = true;
      } else {
        this._onlyLockClick = false;
      }
      // 同时配置了多个触发事件
      const res: { in: EventType | EventType[]; out: EventType | EventType[]; click: boolean }[] = [];
      (trigger as ['click', 'hover']).forEach(item => {
        res.push({
          click: item === 'click',
          in: triggerConfig[item],
          out: outTrigger(item)
        });
      });
      return res;
    }
    return null;
  }

  private _registerTooltipEvent() {
    this.event.on(ChartEvent.tooltipHide, { source: Event_Source_Type.chart }, this._handleTooltipHideOrRelease);
    this.event.on(ChartEvent.tooltipShow, { source: Event_Source_Type.chart }, this._handleTooltipShow);
    this.event.on(ChartEvent.tooltipRelease, { source: Event_Source_Type.chart }, this._handleTooltipHideOrRelease);
  }

  private _handleTooltipShow = (params: TooltipEventParams) => {
    const tooltipData = params.tooltipData;

    if (params.isEmptyTooltip || !tooltipData || !tooltipData.length) {
      this._handleTooltipHideOrRelease();
      return;
    }

    if (isObject(this._spec.followTooltip)) {
      if (this._spec.followTooltip[params.activeType] === false) {
        this._handleTooltipHideOrRelease();
        return;
      }
    }

    const { x, y } = this.calculateTriggerPoint(params);
    this.showDefault = false;
    this._layoutCrosshair(x, y, tooltipData, params.activeType);

    const components = this._getNeedClearVRenderComponents();
    this._hasActive = components.some(comp => comp && comp.attribute.visible !== false);
  };

  private _handleTooltipHideOrRelease = () => {
    this.clearOutEvent();

    this.hide();
  };

  protected _getAxisInfoByField<T = IAxis>(field: 'x' | 'y' | 'category' | 'value') {
    // 加判空防止某些特殊时刻（如 updateSpec 时）鼠标滑过图表导致报错
    const axesComponents = this._option.getComponentsByKey?.('axes') as IAxis[];
    if (!axesComponents?.length) {
      return null;
    }
    let bindingAxesIndex: number[] = get(this._spec, `${field}Field.bindingAxesIndex`);
    if (!bindingAxesIndex) {
      bindingAxesIndex = [];
      axesComponents.forEach((item, index) => {
        if (ORIENT_MAP[field].includes(item.getOrient())) {
          bindingAxesIndex.push(index);
        }
      });
    }
    if (!bindingAxesIndex.length) {
      return null;
    }

    const map: IAxisInfo<T> = new Map();
    let x1 = Infinity;
    let y1 = Infinity;
    let x2 = -Infinity;
    let y2 = -Infinity;
    const { x: sx, y: sy } = this.getLayoutStartPoint();
    bindingAxesIndex.forEach(idx => {
      (x1 = Infinity), (y1 = Infinity), (x2 = -Infinity), (y2 = -Infinity);
      const axis = axesComponents.find(axis => axis.getSpecIndex() === idx);
      if (!axis) {
        return;
      }
      const regions = axis.getRegions();
      regions.forEach(r => {
        const { x: regionStartX, y: regionStartY } = r.getLayoutStartPoint();
        x1 = Math.min(x1, regionStartX - sx);
        y1 = Math.min(y1, regionStartY - sy);
        x2 = Math.max(x2, regionStartX + r.getLayoutRect().width - sx);
        y2 = Math.max(y2, regionStartY + r.getLayoutRect().height - sy);
      });
      map.set(idx, { x1, y1, x2, y2, axis: axis as unknown as T });
    });

    return map;
  }

  changeRegions(regions: IRegion[]): void {
    // do nothing
  }

  onLayoutEnd(ctx: IModelLayoutOption): void {
    const region = this._regions[0];
    this.setLayoutRect(region.getLayoutRect());
    this.setLayoutStartPosition(region.getLayoutStartPoint());

    super.onLayoutEnd(ctx);
  }

  onRender(ctx: IModelRenderOption): void {
    // do nothing
  }

  protected _releaseEvent(): void {
    this.clearOutEvent();

    const triggerConfig = this._getTriggerEvent();
    if (triggerConfig) {
      triggerConfig.forEach(cfg => {
        this._eventOff(cfg.in, false, cfg.click);
        cfg.out && this._eventOff(cfg.out, true);
      });
    }
  }

  protected _parseCrosshairSpec() {
    this._parseFieldInfo();

    const { trigger, triggerOff, labelZIndex, gridZIndex } = this._spec;
    if (trigger) {
      this.trigger = trigger;
    }
    if (triggerOff === 'none' || (isNumber(triggerOff) && triggerOff > 0)) {
      this.triggerOff = triggerOff;
    }
    if (labelZIndex !== undefined) {
      this.labelZIndex = labelZIndex;
    }
    if (gridZIndex !== undefined) {
      this.gridZIndex = gridZIndex;
    }
  }

  protected _parseField(field: ICrosshairCategoryFieldSpec, fieldName: string) {
    const hair = {} as any;
    const { line = {}, label = {}, visible } = field;

    hair.visible = visible;
    hair.type = line.type || 'line';

    if (line.visible === false) {
      hair.style = { visible: false };
    } else {
      const style = line.style || {};
      const { stroke, fill, lineWidth } = style as any;
      const { strokeOpacity, fillOpacity, opacity, ...restStyle } = style as any;
      const isLineType = hair.type === 'line';
      let finalOpacity = isLineType ? strokeOpacity : fillOpacity;
      if (isNumber(opacity)) {
        // FIXME: 之前的兼容逻辑，去掉可能会影响现有 crosshair 的展示效果
        finalOpacity = (finalOpacity ?? 1) * opacity;
      }
      hair.style = {
        opacity: finalOpacity,
        pickable: false,
        visible: true,
        ...restStyle
      };

      if (isLineType) {
        hair.style.stroke = stroke || fill;
        hair.style.lineWidth = get(line, 'width', lineWidth || 2);
      } else {
        hair.style.fill = fill || stroke;
        if (this._spec[fieldName]?.line?.style?.stroke) {
          hair.style.stroke = this._spec[fieldName].line.style.stroke;
        }
        const rectSize = get(line, 'width');
        if (typeof rectSize === 'string') {
          const percent = parseInt(rectSize.substring(0, rectSize.length - 1), 10) / 100;
          hair.style.sizePercent = percent;
        } else if (typeof rectSize === 'number' || typeof rectSize === 'function') {
          hair.style.size = rectSize;
        }
      }
    }

    if (!!label.visible) {
      const labelBackground = label.labelBackground || {};
      const labelStyle = label.style || {};
      const {
        fill: rectFill = 'rgba(47, 59, 82, 0.9)',
        stroke: rectStroke,
        outerBorder,
        ...rectStyle
      } = labelBackground.style || {};
      hair.label = {
        visible: true,
        formatMethod: label.formatMethod,
        formatter: label.formatter,
        minWidth: labelBackground.minWidth,
        maxWidth: labelBackground.maxWidth,
        padding: labelBackground.padding,
        textStyle: {
          fontSize: 14,
          pickable: false,
          ...labelStyle,
          fill: labelStyle.fill || '#fff',
          stroke: get(labelStyle, 'stroke')
        },
        panel: (isBoolean(labelBackground.visible) ? labelBackground.visible : !!labelBackground)
          ? {
              visible: true,
              pickable: false,
              fill: rectFill,
              stroke: rectStroke,
              // Note: 通过这个配置可以保证 label 和 轴 label 对齐
              outerBorder: {
                stroke: rectFill,
                distance: 0,
                lineWidth: 3,
                ...outerBorder
              },
              ...rectStyle
            }
          : { visible: false },
        zIndex: this.labelZIndex,
        childrenPickable: false,
        pickable: false
      };
    } else {
      hair.label = { visible: false };
    }

    return hair;
  }

  protected _filterAxisByPoint<T>(axisMap: IAxisInfo<T>, relativeX: number, relativeY: number) {
    axisMap &&
      axisMap.forEach(item => {
        const axis = item.axis as unknown as IAxis | IPolarAxis;
        if (outOfBounds(item, relativeX, relativeY)) {
          axisMap.delete(axis.getSpecIndex());
        }
        if ((axis as IPolarAxis).type.startsWith('polarAxis')) {
          // 极坐标下需要判断是否在半径内
          const center = (axis as IPolarAxis).getCenter();
          const innerRadius = (axis as IPolarAxis).getInnerRadius();
          const outerRadius = (axis as IPolarAxis).getOuterRadius();
          const distance = PointService.distancePP({ x: relativeX, y: relativeY }, center);
          if (distance > outerRadius || distance < innerRadius) {
            axisMap.delete((axis as IPolarAxis).getSpecIndex());
          }
        }
      });
    return axisMap;
  }

  protected clearOutEvent() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (this._clickLock) {
      this._clickLock = null;
    }

    if (this._hasActive) {
      this._hasActive = null;
    }
  }
}
