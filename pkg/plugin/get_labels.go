package plugin

import (
	"encoding/json"

	"github.com/ckbedwell/grafana-a11y/pkg/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

func (d *Datasource) getAllLabels(req backend.DataQuery) ([]models.Label, error) {
	items, err := d.getAll("https://api.github.com/repos/grafana/grafana/labels", []string{})

	var labels []models.Label

	for _, item := range items {
		var result []models.Label
		err := json.Unmarshal(item, &result)

		if err != nil {
			return nil, err
		}

		labels = append(labels, result...)
	}

	return labels, err
}

func toLabelsDataFrames(res []models.Label, refId string) data.Frames {
	frame := data.NewFrame(
		"labels",
		data.NewField("title", nil, []string{}),
		data.NewField("color", nil, []string{}),
	)
	frame.RefID = refId // TODO: check what happens without this

	for _, v := range res {
		frame.AppendRow(v.Name, v.Color)
	}

	return data.Frames{frame}
}
