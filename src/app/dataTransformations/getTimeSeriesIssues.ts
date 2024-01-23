import { SceneDataTransformer, SceneQueryRunner, CustomTransformOperator } from '@grafana/scenes';
import { DataFrame, FieldType } from '@grafana/data';
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { ISSUES_CLOSED_NAME, ISSUES_CREATED_NAME } from 'app/constants';
import { getDataFrameFromSeries, getFieldValues } from 'app/utils/utils.data';

export function getTimeSeriesIssues(queryRunner: SceneQueryRunner) {
  return new SceneDataTransformer({
    $data: queryRunner,
    transformations: [convertQueries],
  });
}

const convertQueries: CustomTransformOperator = () => (source: Observable<DataFrame[]>) => {
  return source.pipe(
    mergeMap((data: DataFrame[]) => {
      const createdQuery = getDataFrameFromSeries(data, ISSUES_CREATED_NAME);
      const closedQuery = getDataFrameFromSeries(data, ISSUES_CLOSED_NAME);

      if (!createdQuery || !closedQuery) {
        return [];
      }

      return issuesByDate(createdQuery, closedQuery);
    })
  );
};

type TimeUnit = `hour` | `day` | `week` | `month` | `year`;
type Time = number;

export function issuesByDate(createdQuery: DataFrame, closedQuery: DataFrame): DataFrame[][] {
  const createdAtValues = getFieldValues(createdQuery, 'createdAt');
  const closedAtValues = getFieldValues(closedQuery, 'closedAt');
  const timeUnit = `month`;
  const adjustedDateEntries = groupByDate(timeUnit, createdAtValues, closedAtValues);

  return [
    [
      createDataFrame(timeUnit, `Issues Created`, adjustedDateEntries, createdAtValues),
      createDataFrame(timeUnit, `Issues Closed`, adjustedDateEntries, closedAtValues),
    ],
  ];
}

function groupByDate(timeUnit: TimeUnit, ...args: Time[][]) {
  const combinedDates: Time[] = [];

  [...args].map((field) => {
    if (field) {
      combinedDates.push(...field);
    }
  });

  const uniqueDates = [...new Set(combinedDates.map((date) => adjustTimeToStartOfTimeUnit(date, timeUnit)))];
  return Array.from(uniqueDates).sort();
}

function createDataFrame(timeUnit: TimeUnit, name: string, adjustedDateEntries: Time[], dateValues: Time[]): DataFrame {
  const countValues = assignAdjustedDates(timeUnit, dateValues, adjustedDateEntries);

  return {
    fields: [
      {
        config: {},
        name: `reset date`,
        type: FieldType.time,
        values: adjustedDateEntries,
      },
      {
        config: {},
        name,
        type: FieldType.number,
        values: countValues,
      },
    ],
    length: adjustedDateEntries.length,
    name: ``,
    refId: `${name}_DATES`,
  };
}

function adjustTimeToStartOfTimeUnit(time: number, unit: TimeUnit): number {
  const date = new Date(time);

  switch (unit) {
    case `hour`:
      date.setMinutes(0, 0, 0);
      break;
    case `day`:
      date.setHours(0, 0, 0, 0);
      break;
    case `week`:
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - date.getDay());
      break;
    case `month`:
      date.setHours(0, 0, 0, 0);
      date.setDate(1);
      break;
    case `year`:
      date.setHours(0, 0, 0, 0);
      date.setMonth(0, 1);
      break;
  }

  return date.getTime();
}

function assignAdjustedDates(timeUnit: TimeUnit, dates: number[], adjustedDateEntries: number[]) {
  const dateMap = createDateMap(adjustedDateEntries);

  dates.forEach((date) => {
    const adjustedDate = adjustTimeToStartOfTimeUnit(date, timeUnit);
    const dateCount = dateMap.get(adjustedDate) ?? 0;
    dateMap.set(adjustedDate, dateCount + 1);
  });

  return Array.from(dateMap.values());
}

function createDateMap(dates: number[]) {
  return new Map(dates.map((date) => [date, 0]));
}
