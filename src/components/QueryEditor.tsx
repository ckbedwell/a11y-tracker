import React from 'react';
import { InlineField, Select, Switch } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from 'datasource';
import { MyDataSourceOptions, MyQuery } from 'types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onQueryTypeChange = (value: SelectableValue) => {
    onChange({ ...query, queryType: value.value });
    // executes the query

    if ([`issues_all`, `labels`].includes(value.value)) {
      onRunQuery();
    }
  };

  const onDateDisplayChange = (value: SelectableValue) => {
    onChange({ ...query, dateDisplay: value.value });
    // executes the query

    onRunQuery();
  };

  const { dateDisplay, queryType } = query;

  return (
    <div className="gf-form">
      <InlineField label="Omit time">
        <Switch
          value={query.omitTime}
          onChange={(e) => {
            onChange({ ...query, omitTime: e.currentTarget.checked });
            onRunQuery();
          }}
        />
      </InlineField>
      <InlineField label="Query Type">
        <Select
          onChange={onQueryTypeChange}
          options={[
            { label: `Issues`, value: `issues_all` },
            { label: `Labels`, value: `labels` },
            { label: `Issues Created`, value: `issues_created` },
            { label: `Issues Closed`, value: `issues_closed` },
          ]}
          value={queryType}
        />
      </InlineField>
      {[`issues_created`, `issues_closed`].includes(queryType) && (
        <InlineField label="Date display">
          <Select
            onChange={onDateDisplayChange}
            options={[
              { label: `Year`, value: `year` },
              { label: `Month`, value: `month` },
              { label: `Week`, value: `week` },
              { label: `Day`, value: `day` },
              { label: `Hour`, value: `hour` },
            ]}
            value={dateDisplay}
          />
        </InlineField>
      )}
    </div>
  );
}
