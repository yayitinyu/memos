package test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/usememos/memos/store"
)

func TestUserIdentityCreateAndGet(t *testing.T) {
	ctx := context.Background()
	ts := NewTestingStore(ctx, t)
	defer ts.Close()

	user, err := createTestingHostUser(ctx, ts)
	require.NoError(t, err)

	provider := "1"
	externUID := "jane@example.com"
	created, err := ts.CreateUserIdentity(ctx, &store.UserIdentity{
		UserID:    user.ID,
		Provider:  provider,
		ExternUID: externUID,
	})
	require.NoError(t, err)
	require.NotZero(t, created.ID)
	require.Equal(t, user.ID, created.UserID)
	require.Equal(t, provider, created.Provider)
	require.Equal(t, externUID, created.ExternUID)

	got, err := ts.GetUserIdentity(ctx, &store.FindUserIdentity{
		Provider:  &provider,
		ExternUID: &externUID,
	})
	require.NoError(t, err)
	require.NotNil(t, got)
	require.Equal(t, created.ID, got.ID)

	missingProvider := "missing"
	notFound, err := ts.GetUserIdentity(ctx, &store.FindUserIdentity{
		Provider:  &missingProvider,
		ExternUID: &externUID,
	})
	require.NoError(t, err)
	require.Nil(t, notFound)
}

func TestUserIdentityUniqueAndDelete(t *testing.T) {
	ctx := context.Background()
	ts := NewTestingStore(ctx, t)
	defer ts.Close()

	user, err := createTestingHostUser(ctx, ts)
	require.NoError(t, err)

	_, err = ts.CreateUserIdentity(ctx, &store.UserIdentity{
		UserID:    user.ID,
		Provider:  "1",
		ExternUID: "sub-1",
	})
	require.NoError(t, err)

	_, err = ts.CreateUserIdentity(ctx, &store.UserIdentity{
		UserID:    user.ID,
		Provider:  "1",
		ExternUID: "sub-2",
	})
	require.Error(t, err)

	provider := "1"
	err = ts.DeleteUserIdentities(ctx, &store.DeleteUserIdentity{
		UserID:   &user.ID,
		Provider: &provider,
	})
	require.NoError(t, err)

	list, err := ts.ListUserIdentities(ctx, &store.FindUserIdentity{UserID: &user.ID})
	require.NoError(t, err)
	require.Empty(t, list)
}

func TestCreateUserWithIdentity(t *testing.T) {
	ctx := context.Background()
	ts := NewTestingStore(ctx, t)
	defer ts.Close()

	user, err := ts.CreateUserWithIdentity(ctx, &store.User{
		Username:     "sso-user",
		Role:         store.RoleUser,
		Nickname:     "SSO User",
		Email:        "sso@example.com",
		PasswordHash: "hash",
	}, &store.UserIdentity{
		Provider:  "1",
		ExternUID: "ext-1",
	})
	require.NoError(t, err)
	require.NotZero(t, user.ID)

	provider := "1"
	got, err := ts.GetUserIdentity(ctx, &store.FindUserIdentity{
		UserID:   &user.ID,
		Provider: &provider,
	})
	require.NoError(t, err)
	require.NotNil(t, got)
	require.Equal(t, "ext-1", got.ExternUID)
}
