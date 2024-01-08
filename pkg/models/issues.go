package models

type Issue struct {
	Title     string  `json:"title"`
	CreatedAt string  `json:"created_at"`
	State     string  `json:"state"`
	Labels    []Label `json:"labels"`
}

type Label struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}
