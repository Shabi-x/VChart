/* eslint-disable no-duplicate-imports */
import type { IPolarSeries } from '../../series/interface/series';
import type { IComponentOption } from '../interface';
import { ComponentTypeEnum } from '../interface/type';
import type { AxisCurrentValueMap, IPolarCrosshairInfo, IPolarCrosshairSpec } from './interface';
import { isDiscrete } from '@visactor/vscale';
import { Tag } from '@visactor/vrender-components';
import { LineCrosshair, SectorCrosshair, CircleCrosshair, PolygonCrosshair } from '@visactor/vrender-components';
import type { IPolarAxis } from '../axis/polar/interface';
import type { IPoint, StringOrNumber, TooltipActiveType, TooltipData } from '../../typings';
import type { IAxisInfo, IHair, IHairRadius } from './base';
import { BaseCrossHair } from './base';
import type { Maybe } from '@visactor/vutils';
import { polarToCartesian, PointService, isArray, isNil } from '@visactor/vutils';
import type { IGraphic, IGroup, INode } from '@visactor/vrender-core';
import { angleLabelOrientAttribute, radiusLabelOrientAttribute } from '../../util/math';
import { limitTagInBounds } from './utils';
import { Factory } from '../../core/factory';
import { LayoutType } from './config';
import type { IModelSpecInfo } from '../../model/interface';
import { layoutByValue, layoutAngleCrosshair, layoutRadiusCrosshair } from './utils/polar';
import { getFirstSeries } from '../../util';
import type { IDimensionData, IDimensionInfo } from '../../event/events/dimension/interface';
import { getSpecInfo } from '../util';

export class PolarCrossHair<T extends IPolarCrosshairSpec = IPolarCrosshairSpec> extends BaseCrossHair<T> {
  static specKey = 'crosshair';

  static type = ComponentTypeEnum.polarCrosshair;
  type = ComponentTypeEnum.polarCrosshair;
  name: string = ComponentTypeEnum.polarCrosshair;
  private _currValueAngle: AxisCurrentValueMap;
  private _currValueRadius: AxisCurrentValueMap;

  private _angleHair: IHair | undefined;
  private _radiusHair: IHairRadius | undefined;

  private _cacheAngleCrossHairInfo: IPolarCrosshairInfo | undefined;
  private _cacheRadiusCrossHairInfo: IPolarCrosshairInfo | undefined;

  private _radiusCrosshair: IGroup;
  private _radiusLabelCrosshair: Tag;
  private _angleCrosshair: IGroup;
  private _angleLabelCrosshair: Tag;

  static getSpecInfo(chartSpec: any): Maybe<IModelSpecInfo[]> {
    return getSpecInfo<IPolarCrosshairSpec>(chartSpec, this.specKey, this.type, (s: IPolarCrosshairSpec) => {
      return (s.categoryField && s.categoryField.visible !== false) || (s.valueField && s.valueField.visible !== false);
    });
  }

  constructor(spec: T, options: IComponentOption) {
    super(spec, options);
    this._currValueAngle = new Map();
    this._currValueRadius = new Map();
  }

  protected _showDefaultCrosshairBySpec() {
    const { categoryField, valueField } = this._spec as IPolarCrosshairSpec;
    if (categoryField?.visible && categoryField.defaultSelect) {
      const { axisIndex, datum } = categoryField.defaultSelect;
      this._defaultCrosshair(axisIndex, datum, LayoutType.VERTICAL);
    }
    if (valueField?.visible && valueField.defaultSelect) {
      const { axisIndex, datum } = valueField.defaultSelect;
      this._defaultCrosshair(axisIndex, datum, LayoutType.HORIZONTAL);
    }
  }

  private _defaultCrosshair(axisIndex: number, datum: StringOrNumber, tag: number) {
    const axis = this._option.getComponentsByKey('axes').find(c => c.getSpecIndex() === axisIndex) as IPolarAxis;
    if (!axis) {
      return;
    }
    // 横轴
    if (tag === LayoutType.VERTICAL) {
      this._currValueAngle.clear();
      // 根据数值拿到对应的坐标点
      const polarCoord = {
        angle: axis.valueToPosition(datum),
        radius: axis.getOuterRadius()
      };
      const canvasPosition = axis.coordToPoint(polarCoord);
      this._currValueAngle.set(axisIndex, this._getValueByAxis(axis, canvasPosition));
    } else {
      this._currValueRadius.clear();
      // 根据数值拿到对应的坐标点
      const polarCoord = {
        angle: axis.startAngle,
        radius: axis.valueToPosition(datum)
      };
      const canvasPosition = axis.coordToPoint(polarCoord);
      this._currValueRadius.set(axisIndex, this._getValueByAxis(axis, canvasPosition));
    }
    this.layoutByValue(LayoutType.ALL);
  }

  hide() {
    this._radiusCrosshair && this._radiusCrosshair.hideAll();
    this._radiusLabelCrosshair && this._radiusLabelCrosshair.hideAll();
    this._angleCrosshair && this._angleCrosshair.hideAll();
    this._angleLabelCrosshair && this._angleLabelCrosshair.hideAll();
  }

  /**
   * 查找所有落在x和y区域的轴
   * @param relativeX
   * @param relativeY
   */
  private _findAllAxisContains(relativeX: number, relativeY: number) {
    const angleAxisMap = this._getAxisInfoByField<IPolarAxis>('category');
    const radiusAxisMap = this._getAxisInfoByField<IPolarAxis>('value');
    return {
      angleAxisMap: this._filterAxisByPoint<IPolarAxis>(angleAxisMap, relativeX, relativeY),
      radiusAxisMap: this._filterAxisByPoint<IPolarAxis>(radiusAxisMap, relativeX, relativeY)
    };
  }

  /**
   * 根据位置获取所有轴上的value
   * @param axisMap
   * @param p
   * @returns
   */
  private _getAllAxisValues(axisMap: IAxisInfo<IPolarAxis>, point: IPoint, currValue: AxisCurrentValueMap): boolean {
    // 首先不能存在两个离散轴
    let discrete = false;
    axisMap.forEach(item => {
      if (isDiscrete(item.axis.getScale().type)) {
        if (!discrete) {
          discrete = true;
        } else {
          this.enable = false;
        }
      }
    });
    if (!this.enable) {
      return false;
    }
    // 获取所有的value
    axisMap.forEach((item, id) => {
      const axis = item.axis;
      currValue.set(id, this._getValueByAxis(axis, point));
    });
    return true;
  }

  private _getValueByAxis(axis: IPolarAxis, point: IPoint) {
    const { x: axisStartX, y: axisStartY } = axis.getLayoutStartPoint();
    const { x, y } = this.getLayoutStartPoint();
    const value = axis.positionToData({
      x: point.x - (axisStartX - x),
      y: point.y - (axisStartY - y)
    });

    const center = {
      x: axis.getCenter().x + this.getLayoutStartPoint().x,
      y: axis.getCenter().y + this.getLayoutStartPoint().y
    };

    return {
      value,
      axis,
      center,
      innerRadius: axis.getInnerRadius(),
      radius: axis.getOuterRadius(),
      startAngle: axis.startAngle,
      endAngle: axis.endAngle,
      distance: PointService.distancePP(point, axis.getCenter()),
      coord: axis.pointToCoord(point),
      point
    };
  }

  protected _layoutCrosshair(
    relativeX: number,
    relativeY: number,
    tooltipData?: TooltipData,
    activeType?: TooltipActiveType
  ) {
    let x = relativeX;
    let y = relativeY;

    if (tooltipData && tooltipData.length) {
      if (activeType === 'dimension') {
        const dimensionInfo = (tooltipData as IDimensionInfo[])[0];

        if (dimensionInfo.axis) {
          const triggerCoord = (dimensionInfo.axis as IPolarAxis).pointToCoord({ x, y });
          const isRadius = dimensionInfo.axis.getOrient() === 'radius';
          const coord = isRadius
            ? {
                radius: dimensionInfo.position,
                angle: triggerCoord.angle
              }
            : {
                radius: triggerCoord.radius,
                angle: dimensionInfo.position
              };
          const uniformPos = (dimensionInfo.axis as IPolarAxis).coordToPoint(coord);
          x = uniformPos.x;
          y = uniformPos.y;
        }
      } else if (activeType === 'mark') {
        const dimensionData = (tooltipData as IDimensionData[])[0];
        const pos = dimensionData.series.dataToPosition(dimensionData.datum[0]);

        x = pos.x;
        y = pos.y;
      }
    }

    // 找到所有的包含这个点的轴
    const { angleAxisMap, radiusAxisMap } = this._findAllAxisContains(x, y);
    if (angleAxisMap.size === 0 && radiusAxisMap.size === 0) {
      if (this.enableRemain) {
        return;
      }
      // 隐藏
      this.hide();
      return;
    }
    // 删除之前的currValue
    this._currValueAngle.clear();
    this._currValueRadius.clear();
    // 将数据保存到这个对象中，如果不存在，就直接不执行后续逻辑
    angleAxisMap && this._getAllAxisValues(angleAxisMap, { x, y }, this._currValueAngle);
    radiusAxisMap && this._getAllAxisValues(radiusAxisMap, { x, y }, this._currValueRadius);

    this.layoutByValue(LayoutType.ALL);
  }

  layoutByValue(tag: number = LayoutType.ALL) {
    if (!this.enable) {
      return;
    }
    const series = getFirstSeries(this._regions, 'polar') as IPolarSeries;
    if (!series) {
      return;
    }

    const { angle, radius } = layoutByValue(
      series,
      this._currValueAngle,
      this._currValueRadius,
      this._angleHair,
      this._radiusHair,
      this.enableRemain,
      this._cacheAngleCrossHairInfo,
      this._cacheRadiusCrossHairInfo
    );

    if (this.enableRemain) {
      this._cacheAngleCrossHairInfo = { ...angle, _isCache: true };
      this._cacheRadiusCrossHairInfo = { ...radius, _isCache: true };
    }

    if (tag) {
      LayoutType.HORIZONTAL && this._layoutRadius(radius);
      LayoutType.VERTICAL && this._layoutAngle(angle);
    }
  }

  private _layoutAngle(crosshairInfo: IPolarCrosshairInfo) {
    if (crosshairInfo._isCache && this.enableRemain) {
      return;
    }

    const container = this.getContainer();
    const { angle, radius, label, center, visible } = crosshairInfo;
    if (visible) {
      const crosshairType = this._angleHair.type === 'rect' ? 'sector' : 'line';
      const positionAttrs = layoutAngleCrosshair(this._angleHair, crosshairInfo);

      if (this._angleCrosshair) {
        this._angleCrosshair.setAttributes(positionAttrs as unknown as any);
      } else {
        let crosshair;
        // 创建
        if (crosshairType === 'line') {
          crosshair = new LineCrosshair({
            ...(positionAttrs as { start: IPoint; end: IPoint }),
            lineStyle: this._angleHair.style,
            zIndex: this.gridZIndex,
            pickable: false
          });
        } else if (crosshairType === 'sector') {
          crosshair = new SectorCrosshair({
            ...(positionAttrs as {
              center: IPoint;
              innerRadius: number;
              radius: number;
              startAngle: number;
              endAngle: number;
            }),
            sectorStyle: this._angleHair.style,
            zIndex: this.gridZIndex,
            pickable: false
          });
        }
        this._angleCrosshair = crosshair as unknown as IGroup;
        // 添加至场景树
        container.add(crosshair as unknown as INode);
      }

      // 文本
      if (label.visible) {
        const orient = angleLabelOrientAttribute(angle);
        const labelAttrs = {
          ...polarToCartesian(center, radius + label.offset, angle),
          ...this._angleHair.label,
          ...label,
          textStyle: {
            ...this._angleHair.label?.textStyle,
            textAlign: orient.align,
            textBaseline: orient.baseline
          },
          zIndex: this.labelZIndex
        };
        this._updateCrosshairLabel(this._angleLabelCrosshair, labelAttrs, label => {
          label.name = 'crosshair-angle-label';
          this._angleLabelCrosshair = label;
        });
      } else {
        this._angleLabelCrosshair && this._angleLabelCrosshair.hideAll();
      }
    }
  }

  private _layoutRadius(crosshairInfo: IPolarCrosshairInfo) {
    if (crosshairInfo._isCache && this.enableRemain) {
      return;
    }

    const { center, startAngle, label, visible } = crosshairInfo;
    const container = this.getContainer();
    if (visible) {
      const crosshairType = this._radiusHair.smooth ? 'circle' : 'polygon';
      const positionAttrs = layoutRadiusCrosshair(this._radiusHair, crosshairInfo);
      const polygonRadius = positionAttrs.radius;

      if (this._radiusCrosshair) {
        this._radiusCrosshair.setAttributes(positionAttrs as unknown as any);
      } else {
        let crosshair;
        if (crosshairType === 'polygon') {
          crosshair = new PolygonCrosshair({
            ...positionAttrs,
            lineStyle: this._radiusHair.style,
            zIndex: this.gridZIndex + 1 // 样式优化：线盖在面上
          });
        } else {
          crosshair = new CircleCrosshair({
            ...positionAttrs,
            lineStyle: this._radiusHair.style,
            zIndex: this.gridZIndex
          });
        }
        this._radiusCrosshair = crosshair as unknown as IGroup;
        // 添加至场景树
        container.add(crosshair as unknown as INode);
      }

      // 文本
      if (label.visible) {
        const orient = radiusLabelOrientAttribute(startAngle);
        const labelAttrs = {
          ...polarToCartesian(center, polygonRadius, startAngle),
          ...this._radiusHair.label,
          ...label,
          textStyle: {
            ...this._radiusHair.label?.textStyle,
            textAlign: orient.align,
            textBaseline: orient.baseline
          },
          zIndex: this.labelZIndex
        };
        this._updateCrosshairLabel(this._radiusLabelCrosshair, labelAttrs, label => {
          label.name = 'crosshair-radius-label';
          this._radiusLabelCrosshair = label;
        });
      } else {
        this._radiusLabelCrosshair && this._radiusLabelCrosshair.hideAll();
      }
    }
  }

  protected _parseFieldInfo() {
    const { categoryField, valueField } = this._spec as IPolarCrosshairSpec;
    if (categoryField && categoryField.visible) {
      this._angleHair = this._parseField(categoryField, 'categoryField');
    }
    if (valueField && valueField.visible) {
      this._radiusHair = this._parseField(valueField, 'valueField');
      this._radiusHair.smooth = valueField?.line?.smooth;
    }
  }

  private _updateCrosshairLabel(label: Tag, labelAttrs: any, callback: (label: Tag) => void) {
    // 文本
    const container = this.getContainer();
    if (label) {
      label.setAttributes(labelAttrs);
    } else {
      label = new Tag(labelAttrs);
      container?.add(label as unknown as INode);
      callback(label);
    }
    limitTagInBounds(label, this._getLimitBounds());
  }

  protected _getNeedClearVRenderComponents(): IGraphic[] {
    return [
      this._radiusCrosshair,
      this._radiusLabelCrosshair,
      this._angleCrosshair,
      this._angleLabelCrosshair
    ] as unknown as IGroup[];
  }
}

export const registerPolarCrossHair = () => {
  Factory.registerComponent(PolarCrossHair.type, PolarCrossHair);
};
