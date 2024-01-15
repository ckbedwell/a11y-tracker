import React from 'react';
import { InlineField, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from 'datasource';
import { MyDataSourceOptions, MyQuery } from 'types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onQueryTypeChange = (value: SelectableValue) => {
    onChange({ ...query, queryType: value.value });
    // executes the query
    onRunQuery();
  };

  const { queryType } = query;

  return (
    <div className="gf-form">
      <InlineField label="Query Type">
        <Select
          onChange={onQueryTypeChange}
          options={[
            { label: 'Issues', value: 'issues' },
            { label: `Labels`, value: `labels` },
          ]}
          value={queryType}
        />
      </InlineField>
    </div>
  );
}
