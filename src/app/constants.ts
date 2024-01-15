import pluginJson from './plugin.json';
import datasourcePluginJson from '../plugin.json';

export const PLUGIN_BASE_URL = `/a/${pluginJson.id}`;

export enum ROUTES {
  Home = 'home',
  WithTabs = 'page-with-tabs',
  WithDrilldown = 'page-with-drilldown',
  HelloWorld = 'hello-world',
}

export const DATASOURCE_REF = {
  uid: datasourcePluginJson.name,
  type: 'testdata',
};

export const TEST_DATASOURCE_REF = {
  uid: 'grafana-testdata-datasource',
  type: 'testdata',
};

export const DEFAULT_TIMERANGE = {
  from: 'now-6M',
  to: 'now',
};
