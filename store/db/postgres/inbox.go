package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/pkg/errors"
	"google.golang.org/protobuf/encoding/protojson"

	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
)

func (d *DB) CreateInbox(ctx context.Context, create *store.Inbox) (*store.Inbox, error) {
	messageString := "{}"
	if create.Message != nil {
		bytes, err := protojson.Marshal(create.Message)
		if err != nil {
			return nil, errors.Wrap(err, "failed to marshal inbox message")
		}
		messageString = string(bytes)
	}

	now := time.Now().Unix()
	idCol, idVal := d.serialInsertPrefix(ctx, "inbox")
	fields := []string{"sender_id", "receiver_id", "status", "message", "created_ts"}
	args := []any{create.SenderID, create.ReceiverID, create.Status, messageString, now}
	stmt := "INSERT INTO inbox (" + idCol + strings.Join(fields, ", ") + ") VALUES (" + idVal + placeholders(len(args)) + ") RETURNING id, created_ts"
	var createdTs sql.NullInt64
	if err := d.db.QueryRowContext(ctx, stmt, args...).Scan(
		&create.ID,
		&createdTs,
	); err != nil {
		return nil, err
	}
	create.CreatedTs = unixTs(createdTs)

	return create, nil
}

func (d *DB) ListInboxes(ctx context.Context, find *store.FindInbox) ([]*store.Inbox, error) {
	where, args := []string{"1 = 1"}, []any{}

	if find.ID != nil {
		where, args = append(where, "id = "+placeholder(len(args)+1)), append(args, *find.ID)
	}
	if find.SenderID != nil {
		where, args = append(where, "sender_id = "+placeholder(len(args)+1)), append(args, *find.SenderID)
	}
	if find.ReceiverID != nil {
		where, args = append(where, "receiver_id = "+placeholder(len(args)+1)), append(args, *find.ReceiverID)
	}
	if find.Status != nil {
		where, args = append(where, "status = "+placeholder(len(args)+1)), append(args, *find.Status)
	}
	if find.MessageType != nil {
		// Filter by message type using PostgreSQL JSON extraction
		// Note: The type field in JSON is stored as string representation of the enum name
		where, args = append(where, "message::jsonb->>'type' = "+placeholder(len(args)+1)), append(args, find.MessageType.String())
	}

	query := "SELECT id, created_ts, sender_id, receiver_id, status, message FROM inbox WHERE " + strings.Join(where, " AND ") + " ORDER BY created_ts DESC"
	if find.Limit != nil {
		query = fmt.Sprintf("%s LIMIT %d", query, *find.Limit)
		if find.Offset != nil {
			query = fmt.Sprintf("%s OFFSET %d", query, *find.Offset)
		}
	}
	rows, err := d.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*store.Inbox{}
	for rows.Next() {
		inbox := &store.Inbox{}
		var messageBytes []byte
		var createdTs sql.NullInt64
		if err := rows.Scan(
			&inbox.ID,
			&createdTs,
			&inbox.SenderID,
			&inbox.ReceiverID,
			&inbox.Status,
			&messageBytes,
		); err != nil {
			return nil, err
		}
		inbox.CreatedTs = unixTs(createdTs)

		message := &storepb.InboxMessage{}
		if err := protojsonUnmarshaler.Unmarshal(messageBytes, message); err != nil {
			return nil, err
		}
		inbox.Message = message
		list = append(list, inbox)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return list, nil
}

func (d *DB) GetInbox(ctx context.Context, find *store.FindInbox) (*store.Inbox, error) {
	list, err := d.ListInboxes(ctx, find)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get inbox")
	}
	if len(list) != 1 {
		return nil, errors.Errorf("unexpected inbox count: %d", len(list))
	}
	return list[0], nil
}

func (d *DB) UpdateInbox(ctx context.Context, update *store.UpdateInbox) (*store.Inbox, error) {
	set, args := []string{"status = $1"}, []any{update.Status.String()}
	args = append(args, update.ID)
	query := "UPDATE inbox SET " + strings.Join(set, ", ") + " WHERE id = $2 RETURNING id, created_ts, sender_id, receiver_id, status, message"
	inbox := &store.Inbox{}
	var messageBytes []byte
	var createdTs sql.NullInt64
	if err := d.db.QueryRowContext(ctx, query, args...).Scan(
		&inbox.ID,
		&createdTs,
		&inbox.SenderID,
		&inbox.ReceiverID,
		&inbox.Status,
		&messageBytes,
	); err != nil {
		return nil, err
	}
	inbox.CreatedTs = unixTs(createdTs)
	message := &storepb.InboxMessage{}
	if err := protojsonUnmarshaler.Unmarshal(messageBytes, message); err != nil {
		return nil, err
	}
	inbox.Message = message
	return inbox, nil
}

func (d *DB) DeleteInbox(ctx context.Context, delete *store.DeleteInbox) error {
	result, err := d.db.ExecContext(ctx, "DELETE FROM inbox WHERE id = $1", delete.ID)
	if err != nil {
		return err
	}
	if _, err := result.RowsAffected(); err != nil {
		return err
	}
	return nil
}
