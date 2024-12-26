import { registerSequenceScatter } from '../../../../src';
import { VChart } from '@visactor/vchart';
import trainingData1 from '../data/sequence-scatter/Training_process1/data.json';
import trainingData2 from '../data/sequence-scatter/Training_process2/data.json';
import { ISequenceScatterData } from '../../../../src/charts/sequence-scatter/interface';
import { debugConvertDataWithEdges } from './sequence-scatter-transformer.test';
const origianlData = trainingData1;
// const origianlData = trainingData2;
const chartData = {};
debugConvertDataWithEdges();
// /**
//  *
//  * @param originalData
//  * @returns chartDataWithEdges
//  */
// const convertDataWithEdges = originalData => {
//   const chartData: ISequenceScatterData = {};

//   Object.keys(originalData).forEach(inter => {
//     const nodes = originalData[inter].projection.map((pos, index) => ({
//       x: pos[0],
//       y: pos[1],
//       id: `node_${inter}_${index}`
//     }));

//     // 根据 intra_similarity 生成边
//     const edges =
//       originalData[inter].intra_similarity
//         ?.map(similarityGroup => {
//           const edgesInGroup = [];
//           for (let i = 0; i < similarityGroup.length - 1; i++) {
//             edgesInGroup.push({
//               source: nodes[similarityGroup[i]].id,
//               target: nodes[similarityGroup[i + 1]].id
//             });
//           }
//           return edgesInGroup;
//         })
//         .flat() || [];

//     chartData[inter] = {
//       nodes: nodes,
//       edges: edges
//     };
//   });

//   return chartData;
// };

// const chartDataWithEdges = convertDataWithEdges(origianlData);
// console.log(chartDataWithEdges);

Object.keys(origianlData).forEach(inter => {
  chartData[inter] = [];
  origianlData[inter].projection.forEach(pos => {
    chartData[inter].push({
      x: pos[0],
      y: pos[1]
    });
  });
});

const spec = {
  type: 'sequenceScatter',
  data: chartData,
  xField: 'x',
  yField: 'y',

  infoLabel: {
    visible: true,
    style: {
      text: datum => {
        return 'interation: ' + datum.inter;
      }
    }
  },
  player: {
    orient: 'bottom',
    auto: true,
    interval: 2000,
    duration: 2000
  }
};

const run = () => {
  registerSequenceScatter();
  const cs = new VChart(spec, {
    dom: document.getElementById('chart') as HTMLElement,
    //theme: 'dark',
    onError: err => {
      console.error(err);
    }
  });
  console.time('renderTime');

  cs.renderSync();

  console.timeEnd('renderTime');
  window['vchart'] = cs;
  console.log(cs);
};
run();
