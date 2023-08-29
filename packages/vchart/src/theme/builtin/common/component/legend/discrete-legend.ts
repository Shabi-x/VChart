import type { IDiscreteLegendTheme } from '../../../../../component/legend';
import { THEME_CONSTANTS } from '../../constants';

export const discreteLegend: IDiscreteLegendTheme = {
  orient: 'bottom',
  position: 'middle',
  padding: [16, 24],
  title: {
    visible: false,
    padding: 0,
    textStyle: {
      fontSize: THEME_CONSTANTS.l4FontSize,
      lineHeight: THEME_CONSTANTS.l4LineHeight,
      fontFamily: THEME_CONSTANTS.defaultFontFamily,
      fill: { type: 'palette', key: ['titleFontColor', 'primaryFontColor'] },
      fontWeight: 'normal'
    },
    space: 12
  },
  item: {
    visible: true,
    spaceCol: 10,
    spaceRow: 6,
    padding: 2,
    background: {
      state: {
        selectedHover: {
          fill: { type: 'palette', key: 'axisGridColor' }
        },
        unSelectedHover: {
          fill: { type: 'palette', key: 'axisGridColor' }
        }
      }
    },
    shape: {
      space: 6,
      style: {
        lineWidth: 0,
        fillOpacity: 1
      },
      state: {
        unSelected: {
          fillOpacity: 0.5
        }
      }
    },
    label: {
      space: 6,
      style: {
        fill: { type: 'palette', key: 'secondaryFontColor', default: '#89909d' },
        fontSize: THEME_CONSTANTS.l5FontSize,
        lineHeight: THEME_CONSTANTS.l5LineHeight,
        fontFamily: THEME_CONSTANTS.defaultFontFamily
      },
      state: {
        unSelected: {
          fill: { type: 'palette', key: 'disableFontColor' }
        }
      }
    }
  },
  allowAllCanceled: false
};
