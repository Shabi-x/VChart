import type { IFunnelSeriesSpec } from '../../series';
import type { ISeriesSpec } from '../../typings';
import { BaseChartSpecTransformer } from '../base';
import type { IFunnelChartSpec } from './interface';

export class FunnelChartSpecTransformer<T extends IFunnelChartSpec> extends BaseChartSpecTransformer<T> {
  protected needAxes(): boolean {
    return false;
  }

  protected _getDefaultSeriesSpec(spec: T): IFunnelSeriesSpec {
    const series: any = super._getDefaultSeriesSpec(spec, [
      'categoryField',
      'valueField',
      'funnelAlign',
      'funnelOrient',
      'heightRatio',
      'shape',
      'funnel',
      'transform',
      'outerLabel',
      'transformLabel',
      'isTransform',
      'maxSize',
      'minSize',
      'gap',
      'isCone',
      'range'
    ]);

    return series;
  }
  transformSpec(spec: T): void {
    super.transformSpec(spec);

    const defaultSeriesSpec = this._getDefaultSeriesSpec(spec);
    if (!spec.series || spec.series.length === 0) {
      spec.series = [defaultSeriesSpec];
    } else {
      spec.series.forEach((s: ISeriesSpec) => {
        if (!this._isValidSeries(s.type)) {
          return;
        }
        Object.keys(defaultSeriesSpec).forEach(k => {
          if (!(k in s)) {
            s[k] = defaultSeriesSpec[k];
          }
        });
      });
    }
  }
}
