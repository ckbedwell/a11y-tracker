import React from 'react';
import { FieldType, GrafanaTheme2, PanelData } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { SceneComponentProps, SceneObjectBase, sceneGraph } from '@grafana/scenes';
import { css } from '@emotion/css';

import { Stack } from 'app/components/Stack';
import { getDataFrameFromSeries, getFieldValues } from 'app/utils/utils.data';
import { MAIN_QUERY } from 'app/constants';

export class WCAGLevelsOverview extends SceneObjectBase {
  public static Component = WCAGLevelsOverviewRenderer;
}

function WCAGLevelsOverviewRenderer({ model }: SceneComponentProps<WCAGLevelsOverview>) {
  const { data } = sceneGraph.getData(model).useState();
  const styles = useStyles2(getStyles);
  const frame = data && getDataFrameFromSeries(data.series, MAIN_QUERY);
  const values = frame && getFieldValues(frame, `wcag conformance`);
  const wcagLevels = countWCAGLevels(values);

  return (
    <div style={{ marginBottom: `8px` }}>
      <h2 className="h4" style={{ margin: 0, padding: `8px` }}>
        WCAG 2 Levels Overview
      </h2>
      <Stack
        className={styles.container}
        direction={{
          md: `row`,
          xs: `column`,
        }}
      >
        <IndividualPanel title="Level A  Issues" value={wcagLevels.A} />
        <IndividualPanel title="Level AA Issues" value={wcagLevels.AA} />
        <IndividualPanel title="Level AAA Issues" value={wcagLevels.AAA} />
      </Stack>
    </div>
  );
}

function countWCAGLevels(values?: Array<'A' | 'AA' | 'AAA'> | null) {
  if (!values) {
    values = [];
  }

  return values.reduce(
    (acc, value) => {
      acc[value] += 1;
      return acc;
    },
    {
      A: 0,
      AA: 0,
      AAA: 0,
    }
  );
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
