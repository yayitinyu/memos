package postgres

import (
	"context"
	"database/sql"
	"strings"

	"github.com/pkg/errors"

	"github.com/usememos/memos/store"
)

type rowQuerier interface {
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func (d *DB) insertUser(ctx context.Context, q rowQuerier, create *store.User) error {
	idCol, idVal := d.serialInsertPrefix(ctx, "user")
	stmt := "INSERT INTO \"user\" (" + idCol + "username, role, email, nickname, password_hash, avatar_url) VALUES (" + idVal + placeholders(6) + ") RETURNING id, description, created_ts, updated_ts, row_status"
	var createdTs, updatedTs sql.NullInt64
	if err := q.QueryRowContext(
		ctx,
		stmt,
		create.Username,
		create.Role,
		create.Email,
		create.Nickname,
		create.PasswordHash,
		create.AvatarURL,
	).Scan(
		&create.ID,
		&create.Description,
		&createdTs,
		&updatedTs,
		&create.RowStatus,
	); err != nil {
		return err
	}
	create.CreatedTs, create.UpdatedTs = unixTs(createdTs), unixTs(updatedTs)
	return nil
}

func (d *DB) insertUserIdentity(ctx context.Context, q rowQuerier, create *store.UserIdentity) error {
	idCol, idVal := d.serialInsertPrefix(ctx, "user_identity")
	stmt := "INSERT INTO user_identity (" + idCol + "user_id, provider, extern_uid) VALUES (" + idVal + placeholders(3) + ") RETURNING id, created_ts, updated_ts"
	var createdTs, updatedTs sql.NullInt64
	if err := q.QueryRowContext(ctx, stmt, create.UserID, create.Provider, create.ExternUID).Scan(
		&create.ID,
		&createdTs,
		&updatedTs,
	); err != nil {
		return err
	}
	create.CreatedTs, create.UpdatedTs = unixTs(createdTs), unixTs(updatedTs)
	return nil
}

func (d *DB) CreateUserIdentity(ctx context.Context, create *store.UserIdentity) (*store.UserIdentity, error) {
	if err := d.insertUserIdentity(ctx, d.db, create); err != nil {
		return nil, errors.Wrap(err, "failed to create user identity")
	}
	return create, nil
}

func (d *DB) CreateUserWithIdentity(ctx context.Context, createUser *store.User, createIdentity *store.UserIdentity) (*store.User, error) {
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, errors.Wrap(err, "failed to begin user identity transaction")
	}
	defer func() {
		_ = tx.Rollback()
	}()

	if err := d.insertUser(ctx, tx, createUser); err != nil {
		return nil, errors.Wrap(err, "failed to create user")
	}

	createIdentity.UserID = createUser.ID
	if err := d.insertUserIdentity(ctx, tx, createIdentity); err != nil {
		return nil, errors.Wrap(err, "failed to create user identity")
	}

	if err := tx.Commit(); err != nil {
		return nil, errors.Wrap(err, "failed to commit user identity transaction")
	}
	return createUser, nil
}

func (d *DB) ListUserIdentities(ctx context.Context, find *store.FindUserIdentity) ([]*store.UserIdentity, error) {
	where, args := []string{"1 = 1"}, []any{}

	if find.ID != nil {
		where, args = append(where, "id = "+placeholder(len(args)+1)), append(args, *find.ID)
	}
	if find.UserID != nil {
		where, args = append(where, "user_id = "+placeholder(len(args)+1)), append(args, *find.UserID)
	}
	if find.Provider != nil {
		where, args = append(where, "provider = "+placeholder(len(args)+1)), append(args, *find.Provider)
	}
	if find.ExternUID != nil {
		where, args = append(where, "extern_uid = "+placeholder(len(args)+1)), append(args, *find.ExternUID)
	}

	rows, err := d.db.QueryContext(ctx, `
		SELECT
			id,
			user_id,
			provider,
			extern_uid,
			created_ts,
			updated_ts
		FROM user_identity
		WHERE `+strings.Join(where, " AND ")+`
		ORDER BY id ASC`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*store.UserIdentity{}
	for rows.Next() {
		ui := &store.UserIdentity{}
		var createdTs, updatedTs sql.NullInt64
		if err := rows.Scan(
			&ui.ID,
			&ui.UserID,
			&ui.Provider,
			&ui.ExternUID,
			&createdTs,
			&updatedTs,
		); err != nil {
			return nil, err
		}
		ui.CreatedTs, ui.UpdatedTs = unixTs(createdTs), unixTs(updatedTs)
		list = append(list, ui)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return list, nil
}

func (d *DB) DeleteUserIdentities(ctx context.Context, delete *store.DeleteUserIdentity) error {
	where, args := []string{"1 = 1"}, []any{}

	if delete.ID != nil {
		where, args = append(where, "id = "+placeholder(len(args)+1)), append(args, *delete.ID)
	}
	if delete.UserID != nil {
		where, args = append(where, "user_id = "+placeholder(len(args)+1)), append(args, *delete.UserID)
	}
	if delete.Provider != nil {
		where, args = append(where, "provider = "+placeholder(len(args)+1)), append(args, *delete.Provider)
	}

	if _, err := d.db.ExecContext(ctx, "DELETE FROM user_identity WHERE "+strings.Join(where, " AND "), args...); err != nil {
		return err
	}
	return nil
}
