package test

import (
	"context"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/fieldmaskpb"

	v1pb "github.com/usememos/memos/proto/gen/api/v1"
	storepb "github.com/usememos/memos/proto/gen/store"
)

func TestUpdateUserGeneralSettingPreservesDefaults(t *testing.T) {
	ctx := context.Background()
	ts := NewTestService(t)
	t.Cleanup(ts.Cleanup)

	user, err := ts.CreateRegularUser(ctx, "settings-user")
	require.NoError(t, err)
	userCtx := ts.CreateUserContext(ctx, user.ID)
	settingName := fmt.Sprintf("users/%d/settings/GENERAL", user.ID)

	updated, err := ts.Service.UpdateUserSetting(userCtx, &v1pb.UpdateUserSettingRequest{
		Setting: &v1pb.UserSetting{
			Name: settingName,
			Value: &v1pb.UserSetting_GeneralSetting_{
				GeneralSetting: &v1pb.UserSetting_GeneralSetting{Locale: "zh-Hans"},
			},
		},
		UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"locale"}},
	})
	require.NoError(t, err)
	require.Equal(t, "zh-Hans", updated.GetGeneralSetting().Locale)
	require.Equal(t, "PRIVATE", updated.GetGeneralSetting().MemoVisibility)
	require.Empty(t, updated.GetGeneralSetting().Theme)

	// Legacy partial rows should receive the same defaults when read back.
	_, err = ts.Store.UpsertUserSetting(ctx, &storepb.UserSetting{
		UserId: user.ID,
		Key:    storepb.UserSetting_GENERAL,
		Value: &storepb.UserSetting_General{
			General: &storepb.GeneralUserSetting{Locale: "zh-Hans"},
		},
	})
	require.NoError(t, err)

	readBack, err := ts.Service.GetUserSetting(userCtx, &v1pb.GetUserSettingRequest{Name: settingName})
	require.NoError(t, err)
	require.Equal(t, "zh-Hans", readBack.GetGeneralSetting().Locale)
	require.Equal(t, "PRIVATE", readBack.GetGeneralSetting().MemoVisibility)
}
