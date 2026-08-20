package postgres

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/usememos/memos/store"
)

func (d *DB) UpsertReaction(ctx context.Context, upsert *store.Reaction) (*store.Reaction, error) {
	now := time.Now().Unix()
	idCol, idVal := d.serialInsertPrefix(ctx, "reaction")
	fields := []string{"creator_id", "content_id", "reaction_type", "created_ts"}
	args := []interface{}{upsert.CreatorID, upsert.ContentID, upsert.ReactionType, now}
	stmt := "INSERT INTO reaction (" + idCol + strings.Join(fields, ", ") + ") VALUES (" + idVal + placeholders(len(args)) + ") RETURNING id, created_ts"
	var createdTs sql.NullInt64
	if err := d.db.QueryRowContext(ctx, stmt, args...).Scan(
		&upsert.ID,
		&createdTs,
	); err != nil {
		return nil, err
	}
	upsert.CreatedTs = unixTs(createdTs)

	reaction := upsert
	return reaction, nil
}

func (d *DB) ListReactions(ctx context.Context, find *store.FindReaction) ([]*store.Reaction, error) {
	where, args := []string{"1 = 1"}, []any{}

	if find.ID != nil {
		where, args = append(where, "id = "+placeholder(len(args)+1)), append(args, *find.ID)
	}
	if find.CreatorID != nil {
		where, args = append(where, "creator_id = "+placeholder(len(args)+1)), append(args, *find.CreatorID)
	}
	if find.ContentID != nil {
		where, args = append(where, "content_id = "+placeholder(len(args)+1)), append(args, *find.ContentID)
	}
	if len(find.ContentIDList) > 0 {
		holders := make([]string, 0, len(find.ContentIDList))
		for _, id := range find.ContentIDList {
			holders = append(holders, placeholder(len(args)+1))
			args = append(args, id)
		}
		where = append(where, "content_id IN ("+strings.Join(holders, ", ")+")")
	}

	rows, err := d.db.QueryContext(ctx, `
		SELECT
			id,
			created_ts,
			creator_id,
			content_id,
			reaction_type
		FROM reaction
		WHERE `+strings.Join(where, " AND ")+`
		ORDER BY id ASC`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*store.Reaction{}
	for rows.Next() {
		reaction := &store.Reaction{}
		var createdTs sql.NullInt64
		if err := rows.Scan(
			&reaction.ID,
			&createdTs,
			&reaction.CreatorID,
			&reaction.ContentID,
			&reaction.ReactionType,
		); err != nil {
			return nil, err
		}
		reaction.CreatedTs = unixTs(createdTs)
		list = append(list, reaction)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return list, nil
}

func (d *DB) GetReaction(ctx context.Context, find *store.FindReaction) (*store.Reaction, error) {
	list, err := d.ListReactions(ctx, find)
	if err != nil {
		return nil, err
	}
	if len(list) == 0 {
		return nil, nil
	}

	reaction := list[0]
	return reaction, nil
}

func (d *DB) DeleteReaction(ctx context.Context, delete *store.DeleteReaction) error {
	_, err := d.db.ExecContext(ctx, "DELETE FROM reaction WHERE id = $1", delete.ID)
	return err
}
