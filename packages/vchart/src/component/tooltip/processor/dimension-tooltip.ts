import type { BaseEventParams } from '../../../event/interface';
import type { TooltipActiveType } from '../../../typings';
import type { TooltipHandlerParams } from '../interface';
import type { DimensionTooltipInfo, MouseEventData } from './interface';
import { BaseTooltipProcessor } from './base';
import { isNil, isValid } from '@visactor/vutils';
import type { ICartesianSeries, ISeries } from '../../../series/interface';
import { getCartesianDimensionInfo } from '../../../event/events/dimension/util/cartesian';
import { getPolarDimensionInfo } from '../../../event/events/dimension/util/polar';
import type { IDimensionData, IDimensionInfo } from '../../../event/events/dimension/interface';
import { isDiscrete } from '@visactor/vscale';

export class DimensionTooltipProcessor extends BaseTooltipProcessor {
  activeType: TooltipActiveType = 'dimension';

  /** 触发对应类型的 tooltip */
  showTooltip(info: DimensionTooltipInfo, params: BaseEventParams, changePositionOnly: boolean) {
    const newParams: TooltipHandlerParams = {
      ...(params as TooltipHandlerParams),
      dimensionInfo: this._preprocessDimensionInfo(info),
      changePositionOnly,
      tooltip: this.component
    };
    return this._showTooltipByHandler(info, newParams);
  }

  protected _getDimensionInfo(params: BaseEventParams): IDimensionInfo[] {
    let targetDimensionInfo: IDimensionInfo[] | undefined;
    // 处理dimension info
    const chart = this.component.getChart();

    // compute layer offset
    const layer = chart.getCompiler().getStage().getLayer(undefined);
    const point = { x: params.event.viewX, y: params.event.viewY };
    layer.globalTransMatrix.transformPoint({ x: params.event.viewX, y: params.event.viewY }, point);

    targetDimensionInfo = [
      ...(getCartesianDimensionInfo(chart, point, true) ?? []),
      ...(getPolarDimensionInfo(chart, point) ?? [])
    ];
    if (targetDimensionInfo.length === 0) {
      targetDimensionInfo = undefined;
    } else if (targetDimensionInfo.length > 1) {
      // 只保留一个轴的dimension info
      const dimensionAxisInfo = targetDimensionInfo.filter(info => {
        const axis = info.axis;
        if (axis.getSpec().hasDimensionTooltip) {
          return true;
        }

        // 优先显示离散轴 tooltip
        if (!isDiscrete(axis.getScale().type)) {
          return false;
        }
        // 下面的逻辑用来判断当前的离散轴是不是维度轴
        let firstSeries: ICartesianSeries | undefined;
        for (const region of axis?.getRegions() ?? []) {
          for (const series of region.getSeries()) {
            if (series.coordinate === 'cartesian') {
              firstSeries = series as ICartesianSeries;
              break;
            }
          }
          if (isValid(firstSeries)) {
            break;
          }
        }
        if (isValid(firstSeries) && firstSeries.getDimensionField()[0] === firstSeries.fieldY[0]) {
          // 维度轴为Y轴时，选择只显示Y轴tooltip
          return axis.getOrient() === 'left' || axis.getOrient() === 'right';
        }
        // 维度轴为X轴时，选择只显示X轴tooltip
        return axis.getOrient() === 'bottom' || axis.getOrient() === 'top';
      });
      targetDimensionInfo = dimensionAxisInfo.length ? dimensionAxisInfo : targetDimensionInfo.slice(0, 1);

      // datum 去重，保证每个系列的每个数据项只对应于一行 tooltip 内容项
      if (targetDimensionInfo.length > 1) {
        const dimensionDataKeySet = new Set<string>();
        targetDimensionInfo.forEach(info => {
          info.data = info.data.filter(({ key }: IDimensionData) => {
            if (dimensionDataKeySet.has(key)) {
              return false;
            }
            dimensionDataKeySet.add(key);
            return true;
          });
        });
      }
    }

    return targetDimensionInfo;
  }

  /** 获取触发 tooltip 需要的信息 */
  getMouseEventData(params: BaseEventParams): MouseEventData {
    return {
      tooltipInfo: this._getDimensionInfo(params),
      // 排除被声明要忽略的项
      ignore: [...((this.component.getOption() as any).getAllSeries() ?? [])].some(model => {
        const ignoreTriggers = model.tooltipHelper?.ignoreTriggerSet.dimension;
        return (params.model && ignoreTriggers?.has(params.model)) || (params.mark && ignoreTriggers?.has(params.mark));
      })
    };
  }
}
