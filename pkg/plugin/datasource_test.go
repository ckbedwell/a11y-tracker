package plugin

import (
	"fmt"
	"testing"

	"github.com/ckbedwell/grafana-a11y/pkg/models"
	"github.com/stretchr/testify/require"
)

// const apiKey = `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`

// func TestQueryData(t *testing.T) {
// 	di := backend.DataSourceInstanceSettings{
// 		DecryptedSecureJSONData: map[string]string{
// 			"apiKey": apiKey,
// 		},
// 	}

// 	ds, err := NewDatasource(context.Background(), di)
// 	require.NoError(t, err)

// 	myDs, test := ds.(*Datasource)
// 	require.True(t, test)
// 	_, statusCode, err := myDs.QueryApi(context.Background())
// 	require.NoError(t, err)
// 	require.Equal(t, 200, statusCode)

// 	require.NoError(t, err)
// 	// fmt.Println(jsRes)
// }

func TestTerminalLogger(t *testing.T) {
	fmt.Println("Hello World")

	input := []models.Label{
		{
			Name: "test",
		},
		{
			Name: "test2",
		},
	}

	var labels string

	for _, l := range input {
		labels += fmt.Sprintf("%s, ", l.Name)
	}

	fmt.Println(labels)
	require.True(t, true)
}
