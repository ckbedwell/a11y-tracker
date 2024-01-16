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
import { DATASOURCE_REF, DEFAULT_TIMERANGE } from '../../constants';
import { ToggleTimePicker } from './ToggleTimePicker';

export function getBasicScene(templatised = true, seriesToShow = '__server_names') {
  const timeRange = new SceneTimeRange(DEFAULT_TIMERANGE);

  // Variable definition, using Grafana built-in TestData datasource
  const customVariable = new CustomVariable({
    name: 'seriesToShow',
    label: 'Series to show',
    value: '__server_names',
    query: 'Server Names : __server_names, House locations : __house_locations',
  });

  const queryRunner = new SceneQueryRunner({
    datasource: DATASOURCE_REF,
    queries: [
      {
        refId: 'A',
        // datasource: DATASOURCE_REF,
      },
    ],
  });

  // Custom object definition
  const customObject = new ToggleTimePicker({
    hidePicker: true,
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

  return new EmbeddedScene({
    $timeRange: timeRange,
    $variables: new SceneVariableSet({ variables: templatised ? [customVariable] : [] }),
    $data: queryRunner,
    body: new SceneFlexLayout({
      children: [
        new SceneFlexItem({
          minHeight: 300,
          body: PanelBuilders.table()
            // Title is using variable value
            .setTitle(templatised ? '${seriesToShow}' : seriesToShow)
            .build(),
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
