import { DataFrame, Field, FieldType } from '@grafana/data';

export function getDataFrameFromSeries(dataFrames: DataFrame[], refToFind: string): DataFrame | null {
  return dataFrames.find((dataFrame) => dataFrame.refId === refToFind) || null;
}

export function getFieldByTypeFromDataFrame(dataFrame: DataFrame, type: FieldType): Field | null {
  const field = dataFrame.fields.find((f) => f.type === type);

  return field || null;
}

export function getFieldByNameFromDataFrame(dataFrame: DataFrame, name: string): Field | null {
  const field = dataFrame.fields.find((f) => f.name === name);

  return field || null;
}

export function getFieldValues(query: DataFrame, fieldName: string) {
  const field = getFieldByNameFromDataFrame(query, fieldName);

  return field ? field.values.filter(Boolean) : [];
}
