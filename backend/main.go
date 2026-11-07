package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/lib/pq"
)

type Layout struct {
	Slug   string          `json:"slug"`
	Name   string          `json:"name"`
	Blurb  string          `json:"blurb"`
	Kind   string          `json:"kind"`
	Params json.RawMessage `json:"params"`
}
type Run struct {
	Layout   string  `json:"layout"`
	Score    int     `json:"score"`
	AvgSpeed float64 `json:"avgSpeed"`
}

var db *sql.DB

func out(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

func main() {
	var err error
	db, err = sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}
	for i := 0; i < 40 && db.Ping() != nil; i++ {
		time.Sleep(time.Second)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/layouts", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`select slug,name,blurb,kind,params from layouts order by id`)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()
		res := []Layout{}
		for rows.Next() {
			var l Layout
			var p []byte
			rows.Scan(&l.Slug, &l.Name, &l.Blurb, &l.Kind, &p)
			l.Params = p
			res = append(res, l)
		}
		out(w, res)
	})
	mux.HandleFunc("GET /api/runs", func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.Query(`select layout,score,avg_speed from runs where layout=$1 order by score desc limit 8`, r.URL.Query().Get("layout"))
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()
		res := []Run{}
		for rows.Next() {
			var x Run
			rows.Scan(&x.Layout, &x.Score, &x.AvgSpeed)
			res = append(res, x)
		}
		out(w, res)
	})
	mux.HandleFunc("POST /api/runs", func(w http.ResponseWriter, r *http.Request) {
		var x Run
		if json.NewDecoder(r.Body).Decode(&x) != nil || x.Layout == "" {
			http.Error(w, "bad", 400)
			return
		}
		db.Exec(`insert into runs(layout,score,avg_speed) values($1,$2,$3)`, x.Layout, x.Score, x.AvgSpeed)
		out(w, map[string]bool{"ok": true})
	})
	log.Fatal(http.ListenAndServe(":8080", mux))
}
