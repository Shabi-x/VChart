import { ISequenceScatterData } from '../../../../src/charts/sequence-scatter/interface';
import trainingData1 from '../data/sequence-scatter/Training_process1/data.json';

function convertDataWithEdges(originalData: any): ISequenceScatterData {
  const chartData: ISequenceScatterData = {};

  Object.keys(originalData).forEach(inter => {
    const nodes = originalData[inter].projection.map((pos, index) => ({
      x: pos[0],
      y: pos[1],
      id: `node_${inter}_${index}`
    }));

    const edges =
      originalData[inter].intra_similarity
        ?.map(similarityGroup => {
          const edgesInGroup = [];
          for (let i = 0; i < similarityGroup.length - 1; i++) {
            edgesInGroup.push({
              source: nodes[similarityGroup[i]].id,
              target: nodes[similarityGroup[i + 1]].id
            });
          }
          return edgesInGroup;
        })
        .flat() || [];

    chartData[inter] = {
      nodes: nodes,
      edges: edges
    };
  });

  return chartData;
}

//在页面展示输出的数据
export function debugConvertDataWithEdges() {
  const result = convertDataWithEdges(trainingData1);

  console.log('Converted Data:', JSON.stringify(result, null, 2));

  const debugDiv = document.createElement('pre');
  debugDiv.style.position = 'fixed';
  debugDiv.style.top = '0';
  debugDiv.style.left = '0';
  debugDiv.style.background = 'white';
  debugDiv.style.zIndex = '9999';
  debugDiv.style.maxHeight = '600px';
  debugDiv.style.width = '30%';
  debugDiv.style.overflow = 'auto';
  debugDiv.textContent = JSON.stringify(result, null, 2);
  document.body.appendChild(debugDiv);

  return result;
}
