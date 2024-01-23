import React from 'react';
import { FieldType, GrafanaTheme2, PanelData } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { SceneComponentProps, SceneObjectBase, sceneGraph } from '@grafana/scenes';
import { css } from '@emotion/css';

import { getDataFrameFromSeries, getFieldByTypeFromDataFrame } from 'app/utils/utils.data';
import { ISSUES_CLOSED_NAME, ISSUES_CREATED_NAME } from 'app/constants';
import { Stack } from 'app/components/Stack';

export class IssuesTimeSeriesOverview extends SceneObjectBase {
  public static Component = IssuesTimeSeriesOverviewRenderer;
}

function IssuesTimeSeriesOverviewRenderer({ model }: SceneComponentProps<IssuesTimeSeriesOverview>) {
  const { data } = sceneGraph.getData(model).useState();
  const closedIssuesSum = getSum(data, `${ISSUES_CLOSED_NAME}_DATES`);
  const createdIssuesSum = getSum(data, `${ISSUES_CREATED_NAME}_DATES`);
  const styles = useStyles2(getStyles);

  return (
    <Stack
      className={styles.container}
      direction={{
        md: `row`,
        xs: `column`,
      }}
    >
      <IndividualPanel title="Created Issues" value={createdIssuesSum} />
      <IndividualPanel title="Closed Issues" value={closedIssuesSum} />
      <IndividualPanel title="Closure Rate" value={Number((closedIssuesSum / createdIssuesSum).toPrecision(2))} />
    </Stack>
  );
}

function getSum(data: PanelData | undefined, queryName: string) {
  if (!data) {
    return 0;
  }

  const dataFrame = getDataFrameFromSeries(data.series, queryName);

  if (!dataFrame) {
    return 0;
  }

  const query = getFieldByTypeFromDataFrame(dataFrame, FieldType.number);

  if (!query) {
    return 0;
  }

  return query.values.reduce((acc, curr) => acc + curr, 0);
}

const getStyles = (theme: GrafanaTheme2) => ({
  container: css({
    height: `100%`,
  }),
});

const IndividualPanel = ({ title, value }: { title: string; value: number }) => {
  const styles = useStyles2(getPanelStyles);

  return (
    <div className={styles.container}>
      <h2 className="h4">{title}</h2>
      <div className={styles.content}>{value}</div>
    </div>
  );
};

const getPanelStyles = (theme: GrafanaTheme2) => ({
  container: css({
    border: `1px solid ${theme.colors.border.weak}`,
    display: `flex`,
    flexDirection: `column`,
    alignItems: `center`,
    justifyContent: `center`,
    padding: theme.spacing(2),
    width: `100%`,
  }),
  content: css({
    fontSize: theme.typography.h1.fontSize,
  }),
});
