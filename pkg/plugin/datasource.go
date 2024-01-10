package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/ckbedwell/grafana-a11y/pkg/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

const AppID = `ckbedwell-a11y-datasource`

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
	var e error = nil

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		if q.QueryType == "issues" {
			issues, err := d.getAllIssues(req)
			if err != nil {
				log.DefaultLogger.Error("Get issues error", err)
				e = err
			}

			issuesDataFrames := toIssuesDataFrames(issues, q.RefID)
			response.Responses[q.RefID] = toDataResponse(issuesDataFrames, q.RefID)
		}

		if q.QueryType == "labels" {
			labels, err := d.getAllLabels(req)
			if err != nil {
				log.DefaultLogger.Error("Get issues error", err)
				e = err
			}

			labelsDataFrames := toLabelsDataFrames(labels, q.RefID)
			response.Responses[q.RefID] = toDataResponse(labelsDataFrames, q.RefID)
		}
	}

	return response, e
}

func toDataResponse(frames data.Frames, refId string) backend.DataResponse {
	return backend.DataResponse{
		Frames:      frames,
		Error:       nil,
		Status:      backend.Status(200),
		ErrorSource: backend.ErrorSourceDownstream,
	}
}

func toIssuesDataFrames(res []models.Issue, refId string) data.Frames {
	frame := data.NewFrame(
		"issues",
		data.NewField("title", nil, []string{}),
		data.NewField("createdAt", nil, []string{}),
		data.NewField("author", nil, []string{}),
		data.NewField("state", nil, []string{}),
		data.NewField("labels", nil, []string{}),
	)
	frame.RefID = refId // TODO: check what happens without this

	for _, v := range res {
		labels := []string{}

		for _, l := range v.Labels {
			labels = append(labels, l.Name)
		}

		frame.AppendRow(v.Title, v.CreatedAt, v.User.Login, v.State, strings.Join(labels, `,`))
	}

	return data.Frames{frame}
}

func toLabelsDataFrames(res []models.Label, refId string) data.Frames {
	frame := data.NewFrame(
		"issues",
		data.NewField("title", nil, []string{}),
		data.NewField("color", nil, []string{}),
	)
	frame.RefID = refId // TODO: check what happens without this

	for _, v := range res {
		frame.AppendRow(v.Name, v.Color)
	}

	return data.Frames{frame}
}

func (d *Datasource) getAllIssues(req *backend.QueryDataRequest) ([]models.Issue, error) {
	return d.getAll("https://api.github.com/repos/grafana/grafana/issues?state=all&labels=type/accessibility&per_page=100")
}

func (d *Datasource) getAllLabels(req *backend.QueryDataRequest) ([]models.Label, error) {
	var labels []models.Label
	var err error
	// err := d.getAll("https://api.github.com/repos/grafana/grafana/labels", labels)

	return labels, err
}

func (d *Datasource) getAll(baseURL string) ([]models.Issue, error) {
	url := baseURL
	var items []models.Issue

	for {
		log.DefaultLogger.Info("Paginate URL", url)
		request, err := d.createRequest(url)
		log.DefaultLogger.Info("QueryData Request", url)
		if err != nil {
			return nil, err
		}

		resp, headers, err := d.doRequest(request)
		if err != nil {
			return nil, err
		}

		var newItems []models.Issue
		if err := json.Unmarshal(resp, &newItems); err != nil {
			return nil, err
		}

		items = append(items, newItems...)

		linkHeader := headers.Get("Link")
		url = getNextURL(linkHeader)
		if url == "" {
			break
		}
	}

	return items, nil
}

func getNextURL(linkHeader string) string {
	links := strings.Split(linkHeader, ",")
	var nextURL string

	for _, link := range links {
		if strings.Contains(link, `rel="next"`) {
			nextURL = getURL(link)
			break
		}
	}

	return nextURL
}

func getURL(link string) string {
	re := regexp.MustCompile(`<(.*)>`)
	matches := re.FindStringSubmatch(link)
	return matches[1]
}

func (d *Datasource) doRequest(request *http.Request) ([]byte, http.Header, error) {
	res, err := d.httpClient.Do(request)

	if err != nil {
		return nil, nil, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, nil, err
	}

	return body, res.Header, nil
}

func (d *Datasource) createRequest(url string) (*http.Request, error) {
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

func (d *Datasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	request, err := d.createRequest("https://api.github.com/repos/grafana/grafana/issues?state=all&labels=type/accessibility")
	if err != nil {
		return &backend.CheckHealthResult{
			Status:  backend.HealthStatusError,
			Message: `Failed to construct request`,
		}, err
	}

	res, _, err := d.doRequest(request)

	if err != nil {
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
