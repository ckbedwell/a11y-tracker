import React, { ChangeEvent } from 'react';
import { InlineField, Input, Select } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
  const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, queryText: event.target.value });
  };

  const onQueryTypeChange = (value: SelectableValue) => {
    onChange({ ...query, queryType: value.value });
    // executes the query
    onRunQuery();
  };

  const { queryText, queryType } = query;

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
      <InlineField label="Query Text" labelWidth={16} tooltip="Not used yet">
        <Input onChange={onQueryTextChange} value={queryText || ''} />
      </InlineField>
    </div>
  );
}
