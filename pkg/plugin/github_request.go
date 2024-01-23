package plugin

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
)

// TODO: handle - what if there are 1000s of pages for pagination?
// TODO: look into worker pool / waiting group
func (d *Datasource) getAll(baseURL string, queriesParam []string) ([][]byte, error) {
	url := constructURL(baseURL, queriesParam)
	var items [][]byte

	for {
		log.DefaultLogger.Info(`url`, url)
		request, err := d.createRequest(url)
		if err != nil {
			return nil, err
		}

		body, headers, err := d.doRequest(request)
		if err != nil {
			return nil, err
		}

		items = append(items, body)

		linkHeader := headers.Get("Link")
		url = getNextURL(linkHeader)
		if url == "" {
			break
		}
	}

	return items, nil
}

func constructURL(baseURL string, queriesParam []string) string {
	params := []string{
		"per_page=100",
		fmt.Sprintf("q=%s", strings.Join(queriesParam, `+`)),
	}

	return fmt.Sprintf("%s?%s", baseURL, strings.Join(params, `&`))
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
