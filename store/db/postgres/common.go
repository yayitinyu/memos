package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"sync"

	"github.com/pkg/errors"
	"google.golang.org/protobuf/encoding/protojson"
)

var (
	protojsonUnmarshaler = protojson.UnmarshalOptions{
		DiscardUnknown: true,
	}
)

func placeholder(n int) string {
	return "$" + fmt.Sprint(n)
}

func placeholders(n int) string {
	list := []string{}
	for i := 0; i < n; i++ {
		list = append(list, placeholder(i+1))
	}
	return strings.Join(list, ", ")
}

func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func quoteLiteral(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func unixTs(n sql.NullInt64) int64 {
	if n.Valid && n.Int64 > 0 {
		return n.Int64
	}
	return 0
}

// nextIDExpr returns a SQL expression that allocates the next integer primary key.
// It prefers an attached SERIAL/IDENTITY sequence and falls back to MAX(id)+1 when
// the table was created as INTEGER PRIMARY KEY without a default (common after
// SQLite → PostgreSQL dumps).
func nextIDExpr(table string) string {
	return fmt.Sprintf(
		`COALESCE((SELECT nextval(seq) FROM (SELECT pg_get_serial_sequence(%s, 'id') AS seq) s WHERE seq IS NOT NULL), (SELECT COALESCE(MAX(id), 0) + 1 FROM %s))`,
		quoteLiteral(quoteIdent(table)),
		quoteIdent(table),
	)
}

// serialInsertPrefix returns `id, ` / `<expr>, ` fragments when the table has no
// SERIAL/IDENTITY default. After a successful repair the column can be omitted.
func (d *DB) serialInsertPrefix(ctx context.Context, table string) (string, string) {
	if err := d.ensureSerialDefault(ctx, table); err == nil {
		return "", ""
	}
	return "id, ", nextIDExpr(table) + ", "
}

type serialResult struct {
	once sync.Once
	err  error
}

func (d *DB) ensureSerialDefault(ctx context.Context, table string) error {
	v, _ := d.serialOnce.LoadOrStore(table, &serialResult{})
	result := v.(*serialResult)
	result.once.Do(func() {
		result.err = d.attachSerialDefault(ctx, table)
	})
	return result.err
}

func (d *DB) attachSerialDefault(ctx context.Context, table string) error {
	var columnDefault sql.NullString
	var isIdentity string
	err := d.db.QueryRowContext(ctx, `
		SELECT column_default, COALESCE(is_identity, 'NO')
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = $1
		  AND column_name = 'id'
	`, table).Scan(&columnDefault, &isIdentity)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return errors.Wrapf(err, "check serial default for %s.id", table)
	}
	if isIdentity == "YES" {
		return nil
	}
	if columnDefault.Valid && strings.Contains(columnDefault.String, "nextval") {
		return nil
	}

	seq := table + "_id_seq"
	quotedTable := quoteIdent(table)
	quotedSeq := quoteIdent(seq)

	if _, err := d.db.ExecContext(ctx, "CREATE SEQUENCE IF NOT EXISTS "+quotedSeq); err != nil {
		return errors.Wrapf(err, "create sequence %s", seq)
	}

	var maxID sql.NullInt64
	if err := d.db.QueryRowContext(ctx, "SELECT MAX(id) FROM "+quotedTable).Scan(&maxID); err != nil {
		return errors.Wrapf(err, "read max id from %s", table)
	}
	if maxID.Valid && maxID.Int64 > 0 {
		if _, err := d.db.ExecContext(ctx, "SELECT setval($1, $2, true)", seq, maxID.Int64); err != nil {
			return errors.Wrapf(err, "setval %s", seq)
		}
	} else if _, err := d.db.ExecContext(ctx, "SELECT setval($1, 1, false)", seq); err != nil {
		return errors.Wrapf(err, "setval %s", seq)
	}

	alterDefault := fmt.Sprintf("ALTER TABLE %s ALTER COLUMN id SET DEFAULT nextval(%s::regclass)", quotedTable, quoteLiteral(seq))
	if _, err := d.db.ExecContext(ctx, alterDefault); err != nil {
		return errors.Wrapf(err, "attach serial default to %s.id", table)
	}
	if _, err := d.db.ExecContext(ctx, fmt.Sprintf("ALTER SEQUENCE %s OWNED BY %s.id", quotedSeq, quotedTable)); err != nil {
		return errors.Wrapf(err, "own sequence %s", seq)
	}
	return nil
}
