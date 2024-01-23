import {
  CustomVariable,
  EmbeddedScene,
  PanelBuilders,
  SceneControlsSpacer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  SceneRefreshPicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { VizOrientation } from '@grafana/data';
import { DATASOURCE_REF, DEFAULT_TIMERANGE, ISSUES_CLOSED_NAME, ISSUES_CREATED_NAME, MAIN_QUERY } from 'app/constants';
import { ToggleTimePicker } from './ToggleTimePicker';
import { getTimeSeriesIssues } from 'app/dataTransformations/getTimeSeriesIssues';
import { getLabelFromIssues } from 'app/dataTransformations/getLabelFromIssues';
import { IssuesTimeSeriesOverview } from './VizPanels/IssuesTimeSeriesOverview';
import { WCAGLevelsOverview } from './VizPanels/WCAGLevelsOverview';

const repoOptions = {
  'grafana/grafana': `grafana/grafana`,
  'grafana/grafana-k6-app': `grafana/grafana-k6-app`,
};

export function getBasicScene(templatised = true, seriesToShow = '__server_names') {
  const timeRange = new SceneTimeRange(DEFAULT_TIMERANGE);
  const omitTime = false;

  // Variable definition, using Grafana built-in TestData datasource
  const customVariable = new CustomVariable({
    name: 'projectToShow',
    label: 'Project to show',
    value: '__project_to_show',
    query: Object.entries(repoOptions)
      .map(([value, label]) => `${label} : ${value}`)
      .join(`, `),
  });

  const queryRunner = new SceneQueryRunner({
    datasource: DATASOURCE_REF,
    queries: [
      {
        refId: MAIN_QUERY,
        omitTime,
        queryType: `issues_all`,
      },
      {
        refId: ISSUES_CREATED_NAME,
        omitTime,
        queryType: `issues_created`,
      },
      {
        refId: ISSUES_CLOSED_NAME,
        omitTime,
        queryType: `issues_closed`,
      },
    ],
  });

  // Custom object definition
  const customObject = new ToggleTimePicker({
    hidePicker: omitTime,
  });

  // Query runner activation handler that will update query runner state when custom object state changes
  queryRunner.addActivationHandler(() => {
    const sub = customObject.subscribeToState((newState) => {
      queryRunner.setState({
        queries: [
          {
            ...queryRunner.state.queries[0],
            omitTime: newState.hidePicker,
          },
        ],
      });
      queryRunner.runQueries();
    });

    return () => {
      sub.unsubscribe();
    };
  });

  const debugView = PanelBuilders.table().setTitle('Debug view').build();

  return new EmbeddedScene({
    $timeRange: timeRange,
    $variables: new SceneVariableSet({ variables: templatised ? [customVariable] : [] }),
    $data: queryRunner,
    body: new SceneFlexLayout({
      direction: 'column',
      children: [
        new SceneFlexLayout({
          direction: 'row',
          children: [
            new SceneFlexItem({
              minHeight: 150,
              body: debugView,
            }),
            new SceneFlexLayout({
              direction: 'column',
              children: [
                new SceneFlexItem({
                  minHeight: 150,
                  body: new WCAGLevelsOverview({}),
                }),
                new SceneFlexItem({
                  $data: getLabelFromIssues(queryRunner),
                  minHeight: 600,
                  body: PanelBuilders.barchart().setOption(`orientation`, VizOrientation.Horizontal).build(),
                }),
              ],
            }),
          ],
        }),
        new SceneFlexItem({
          minHeight: 600,
          body: PanelBuilders.table()
            // Title is using variable value
            .setTitle(templatised ? '${seriesToShow}' : seriesToShow)
            .build(),
        }),
        new SceneFlexLayout({
          $data: getTimeSeriesIssues(queryRunner),
          direction: 'column',
          children: [
            new SceneFlexItem({
              minHeight: 150,
              body: new IssuesTimeSeriesOverview({}),
            }),
            new SceneFlexItem({
              minHeight: 600,
              body: PanelBuilders.timeseries().build(),
            }),
          ],
        }),
      ],
    }),
    controls: [
      new VariableValueSelectors({}),
      new SceneControlsSpacer(),
      customObject,
      new SceneRefreshPicker({
        intervals: ['30m', '1h'],
        isOnCanvas: true,
      }),
    ],
  });
}
