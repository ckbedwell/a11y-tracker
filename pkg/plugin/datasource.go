package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/ckbedwell/grafana-a11y/pkg/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

const AppID = `a11y-datasource`

type jsonRes []models.Issue

func NewDatasource(ctx context.Context, settings backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	return &Datasource{
		apiKey:     settings.DecryptedSecureJSONData["apiKey"],
		httpClient: httpClient,
	}, nil
}

type Datasource struct {
	apiKey     string
	httpClient *http.Client
}

func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// create response struct
	response := backend.NewQueryDataResponse()
	var err error = nil

	if issueRequest {
		issues, err := d.getIssues(ctx, req)
	}

	if labelRequest {
		labels, err := d.getLabels(ctx, req)
	}

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res, statusCode, err := d.QueryApi(ctx)
		if err != nil || statusCode != 200 {
			log.DefaultLogger.Error("QueryApi", err)
			log.DefaultLogger.Error("StatusCode", statusCode)
		}
		// save the response in a hashmap
		// based on with RefID as identifier
		log.DefaultLogger.Info("QueryData", res)
		response.Responses[q.RefID] = toDataResponse(res, statusCode, q.RefID)
	}

	return response, err
}

func toDataResponse(res jsonRes, statusCode int, refId string) backend.DataResponse {
	if statusCode == 0 {
		statusCode = 500
	}

	return backend.DataResponse{
		Frames:      toDataFrames(res, refId),
		Error:       nil,
		Status:      backend.Status(statusCode),
		ErrorSource: backend.ErrorSourceDownstream,
	}
}

func toDataFrames(res jsonRes, refId string) data.Frames {
	frame := data.NewFrame(
		"issues",
		data.NewField("title", nil, []string{}),
		data.NewField("createdAt", nil, []string{}),
		data.NewField("state", nil, []string{}),
		data.NewField("labels", nil, []string{}),
	)
	frame.RefID = refId // TODO: check what happens without this

	for _, v := range res {
		labels := []string{}

		for _, l := range v.Labels {
			labels = append(labels, l.Name)
		}

		log.DefaultLogger.Debug("toDataFrames", labels)
		frame.AppendRow(v.Title, v.CreatedAt, v.State, strings.Join(labels, `,`))
	}

	log.DefaultLogger.Info("toDataFrames", frame)
	return data.Frames{frame}
}

func (d *Datasource) getIssues(ctx context.Context, req *backend.QueryDataRequest) ([]models.Issue, error) {
	request, err := d.makeRequest("https://api.github.com/repos/grafana/grafana/issues?creator=ckbedwell", d.apiKey)

	if err != nil {
		return nil, err
	}

	bytes, err := d.doRequest(request)
	if err != nil {
		return nil, err
	}

	var issues []models.Issue

	if err := json.Unmarshal(bytes, &issues); err != nil {
		return nil, err
	}

	return issues, nil
}

func (d *Datasource) getLabels(ctx context.Context, req *backend.QueryDataRequest) ([]models.Label, error) {
	request, err := d.makeRequest("https://api.github.com/repos/grafana/grafana/labels", d.apiKey)
	if err != nil {
		return nil, err
	}

	bytes, err := d.doRequest(request)
	if err != nil {
		return nil, err
	}

	var labels []models.Label

	if err := json.Unmarshal(bytes, &labels); err != nil {
		return nil, err
	}

	return labels, nil
}

func (d *Datasource) doRequest(request *http.Request) ([]byte, error) {
	res, err := d.httpClient.Do(request)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}

func (d *Datasource) makeRequest(url string) (*http.Request, error) {
	request, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.DefaultLogger.Error("Making request", err)
		return request, err
	}

	request.Header.Set("Accept", "application/vnd.github+json")
	request.Header.Set("Authorization", fmt.Sprintf("Bearer %s", d.apiKey))
	request.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	return request, err
}

func (d *Datasource) queryApi(ctx context.Context) {

}

func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res, statusCode, err := d.QueryApi(ctx)

	if err != nil || statusCode != 200 {
		log.DefaultLogger.Error("CheckHealth", res)

		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: `Datasource is NOT working`,
		}, err
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: `Datasource is working`,
	}, nil
}
