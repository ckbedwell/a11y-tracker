package plugin

import (
	"fmt"
	"testing"
)

func TestDatesInRange(t *testing.T) {
	dates, _ := GenerateDatesMap("2022-01-12T10:57:39Z", "2023-12-12T10:57:39Z", "year")
	fmt.Println(dates)
}
