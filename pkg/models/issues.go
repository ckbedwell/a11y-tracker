package models

type Issue struct {
	Title     string  `json:"title"`
	CreatedAt string  `json:"created_at"`
	State     string  `json:"state"`
	User      User    `json:"user"`
	Labels    []Label `json:"labels"`
}

type User struct {
	Login string `json:"login"`
}

type Label struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}
