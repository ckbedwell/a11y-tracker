package plugin

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/ckbedwell/grafana-a11y/pkg/models"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

type DateMap map[string]int64

func (d *Datasource) getAllIssues(queries []string) ([]models.Issue, error) {
	query := []string{
		"is:issue",
		"label:type/accessibility",
	}

	items, err := d.getAll("https://api.github.com/search/issues", append(query, queries...))
	if err != nil {
		return nil, err
	}

	var issues []models.Issue

	for _, item := range items {
		var result models.SearchIssuesResponse
		err := json.Unmarshal(item, &result)

		if err != nil {
			return nil, err
		}

		issues = append(issues, result.Items...)
	}

	return issues, nil
}

func toIssuesDataFrames(res []models.Issue) data.Frames {
	frame := data.NewFrame(
		"issues",
		data.NewField("title", nil, []string{}),
		data.NewField("createdAt", nil, []time.Time{}),
		data.NewField("closedAt", nil, []*time.Time{}),
		data.NewField("updatedAt", nil, []time.Time{}),
		data.NewField("author", nil, []string{}),
		data.NewField("state", nil, []string{}),
		data.NewField("labels", nil, []string{}),
	)

	for _, v := range res {
		labels := []string{}

		for _, l := range v.Labels {
			labels = append(labels, l.Name)
		}

		frame.AppendRow(v.Title, v.CreatedAt, v.ClosedAt, v.UpdatedAt, v.User.Login, v.State, strings.Join(labels, `,`))
	}

	return data.Frames{frame}
}

func toIssuesDateDataFrames(res []models.Issue, query backend.DataQuery, issueQueryOptions models.IssuesQueryOptions, dateField string) data.Frames {
	if len(res) == 0 {
		return nil
	}

	from := query.TimeRange.From
	to := query.TimeRange.To

	if !issueQueryOptions.OmitTime {
		if dateField == `created` {
			from = res[0].CreatedAt
			to = res[len(res)-1].CreatedAt
		}

		if dateField == `closed` {
			from = *res[0].ClosedAt
			to = *res[len(res)-1].ClosedAt
		}
	}

	dateUnit := handleDateQuery(query).DateDisplay
	dates, err := GenerateDatesMap(from, to, dateUnit)

	if err != nil {
		log.DefaultLogger.Error("GenerateDateRange error", err)
	}

	var issueDates []time.Time
	for _, issue := range res {
		if dateField == `closed` {
			issueDates = append(issueDates, *issue.ClosedAt)
		}

		if dateField == `created` {
			issueDates = append(issueDates, issue.CreatedAt)
		}
	}

	return assignIssuesToDates(issueDates, dates, dateUnit, dateField)
}

func handleDateQuery(query backend.DataQuery) models.IssuesQueryOptions {
	var dateQuery models.IssuesQueryOptions
	err := json.Unmarshal(query.JSON, &dateQuery)

	if err != nil {
		log.DefaultLogger.Error("Unmarshal error", err)
	}

	return dateQuery
}

func GenerateDatesMap(fromDate time.Time, toDate time.Time, unit string) (DateMap, error) {
	// Adjust fromDate to the earliest time within the specified unit
	adjustedFromDate, err := resetDate(fromDate, unit)
	if err != nil {
		return nil, err
	}

	dates := make(DateMap)

	for currentDate := adjustedFromDate; !currentDate.After(toDate); {
		key := currentDate.Format(time.RFC3339)
		dates[key] = 0

		switch unit {
		case "hour":
			currentDate = currentDate.Add(time.Hour)
		case "day":
			currentDate = currentDate.AddDate(0, 0, 1)
		case "week":
			currentDate = currentDate.AddDate(0, 0, 7)
		case "month":
			currentDate = currentDate.AddDate(0, 1, 0)
		case "year":
			currentDate = currentDate.AddDate(1, 0, 0)
		default:
			return nil, fmt.Errorf("unknown unit: %s", unit)
		}
	}

	return dates, nil
}

func assignIssuesToDates(toSort []time.Time, dateMap DateMap, dateUnit string, dateField string) data.Frames {
	frame := data.NewFrame(
		dateField,
		data.NewField("date", nil, []time.Time{}),
		data.NewField(fmt.Sprintf("Issues %s", dateField), nil, []int64{}),
	)

	for _, date := range toSort {
		resetted, err := resetDate(date, dateUnit)

		if err != nil {
			log.DefaultLogger.Error("Reset date error", err)
		}

		dateMap[resetted.Format(time.RFC3339)]++
	}

	for date, count := range dateMap {
		parsedDate, err := time.Parse(time.RFC3339, date)
		if err != nil {
			log.DefaultLogger.Error("Parse time error", err)
		}

		frame.AppendRow(parsedDate, count)
	}

	return data.Frames{frame}
}

func resetDate(date time.Time, unit string) (time.Time, error) {
	switch unit {
	case "hour":
		return date.Truncate(time.Hour), nil
	case "day":
		return time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location()), nil
	case "week":
		// Set to the start of the week (assuming Sunday as the first day of the week)
		offset := int(time.Monday - date.Weekday())
		if offset > 0 {
			offset -= 7
		}
		return date.AddDate(0, 0, offset).Truncate(24 * time.Hour), nil
	case "month":
		return time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, date.Location()), nil
	case "year":
		return time.Date(date.Year(), 1, 1, 0, 0, 0, 0, date.Location()), nil
	default:
		return time.Now(), fmt.Errorf("unknown unit: %s", unit)
	}
}
