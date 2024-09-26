import type { ISeriesTooltipHelper } from '../interface';
import { BaseSeriesTooltipHelper } from '../base/tooltip-helper';
import type { ITooltipLinePattern, ITooltipPattern, TooltipActiveType } from '../../typings';
import { TimeUtil } from '@visactor/vutils';

export class LinkSeriesTooltipHelper extends BaseSeriesTooltipHelper implements ISeriesTooltipHelper {
  enableByType(activeType: TooltipActiveType): boolean {
    return activeType === 'mark';
  }

  getDefaultTitlePattern(activeType: TooltipActiveType): ITooltipPattern['title'] {
    return {
      key: 'link info',
      value: 'link info'
    };
  }

  shapeTypeCallback = () => {
    return 'square';
  };

  getDefaultContentList(): ITooltipLinePattern[] {
    return [
      {
        key: 'time',
        value: (datum: any) => TimeUtil.getInstance().timeFormat('%Y%m%d %H:%M', datum.from.split('_')[1])
      },
      {
        key: 'type',
        value: (datum: any) => datum.action_type
      },
      {
        key: 'from',
        value: (datum: any) => datum.from
      },
      {
        key: 'to',
        value: (datum: any) => datum.to
      }
    ];
  }
}
