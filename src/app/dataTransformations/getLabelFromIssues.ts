import { DataFrame, FieldType } from '@grafana/data';
import { SceneDataTransformer, SceneQueryRunner, CustomTransformOperator } from '@grafana/scenes';
import { Observable, mergeMap } from 'rxjs';

import { ISSUES_CLOSED_NAME, ISSUES_CREATED_NAME } from 'app/constants';
import { getDataFrameFromSeries, getFieldValues } from 'app/utils/utils.data';

export function getLabelFromIssues(queryRunner: SceneQueryRunner) {
  return new SceneDataTransformer({
    $data: queryRunner,
    transformations: [(source) => convertQueries(source)],
  });
}

const convertQueries: CustomTransformOperator = () => (source: Observable<DataFrame[]>) => {
  return source.pipe(
    mergeMap((data: DataFrame[]) => {
      const createdQuery = getDataFrameFromSeries(data, ISSUES_CREATED_NAME);
      const closedQuery = getDataFrameFromSeries(data, ISSUES_CLOSED_NAME);
      const dataFrame = createDataFrame(`wcag`, createdQuery, closedQuery);

      return [[dataFrame]];
    })
  );
};

function createDataFrame(labelPrefix: string, ...dataFrames: Array<DataFrame | null>): DataFrame {
  const combinedMap = new Map<string, number[]>();

  const realFrames: DataFrame[] = dataFrames.filter((frame) => frame !== null) as DataFrame[];

  realFrames.forEach((dataFrame, i) => {
    if (dataFrame) {
      const labels = extractLabels(dataFrame, labelPrefix);

      labels.forEach((value, key) => {
        if (combinedMap.has(key)) {
          combinedMap.set(key, [...(combinedMap.get(key) ?? []), value]);
        } else {
          combinedMap.set(key, [...new Array(i).fill(0), value]);
        }
      });
    }
  });

  const labelKeys = Array.from(combinedMap.keys());
  const values = Array.from(combinedMap.values());

  return {
    fields: [
      {
        config: {},
        name: `${labelPrefix} labels`,
        type: FieldType.string,

        values: labelKeys,
      },
      ...realFrames.map((frame, i) => ({
        config: {},
        name: frame.name ?? ``,
        type: FieldType.number,
        values: values.map((value) => value[i] ?? 0),
      })),
    ],
    length: labelKeys.length,
    name: ``,
    refId: `LABEL_EXTRACTION_${labelPrefix}`,
  };
}

function extractLabels(dataFrame: DataFrame, labelPrefix: string) {
  const labelValues = getFieldValues(dataFrame, `labels`);
  const labelMap = new Map();

  labelValues.forEach((labels) => {
    let foundPrefix = false;

    labels
      .toLowerCase()
      .split(`,`)
      .forEach((label: string) => {
        if (label.startsWith(labelPrefix)) {
          labelMap.has(label) ? labelMap.set(label, labelMap.get(label) + 1) : labelMap.set(label, 1);
          foundPrefix = true;
        }
      });

    if (!foundPrefix) {
      const key = `no-${labelPrefix} label`;

      labelMap.has(key) ? labelMap.set(key, labelMap.get(key) + 1) : labelMap.set(key, 1);
    }
  });

  return labelMap;
}
