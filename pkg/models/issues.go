package models

import "time"

type IssuesQueryOptions struct {
	DateDisplay string `json:"dateDisplay"`
	DateField   string `json:"dateField"`
	OmitTime    bool   `json:"omitTime"`
}

type SearchIssuesResponse struct {
	Items []Issue `json:"items"`
}

type Issue struct {
	Title     string     `json:"title"`
	CreatedAt time.Time  `json:"created_at"`
	ClosedAt  *time.Time `json:"closed_at"`
	UpdatedAt time.Time  `json:"updated_at"`
	State     string     `json:"state"`
	User      User       `json:"user"`
	Labels    []Label    `json:"labels"`
}

type User struct {
	Login string `json:"login"`
}

type Label struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}
