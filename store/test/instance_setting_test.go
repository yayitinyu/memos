package test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
)

func TestInstanceSettingV1Store(t *testing.T) {
	ctx := context.Background()
	ts := NewTestingStore(ctx, t)
	instanceSetting, err := ts.UpsertInstanceSetting(ctx, &storepb.InstanceSetting{
		Key: storepb.InstanceSettingKey_GENERAL,
		Value: &storepb.InstanceSetting_GeneralSetting{
			GeneralSetting: &storepb.InstanceGeneralSetting{
				AdditionalScript: "",
				LegalNotice: &storepb.InstanceLegalNotice{
					DisplayIcpFiling:            true,
					IcpFilingNumber:             "京ICP备12345678号",
					IcpFilingUrl:                "https://beian.miit.gov.cn/",
					DisplayPublicSecurityFiling: true,
					PublicSecurityFilingNumber:  "京公网安备 11010502000000号",
					PublicSecurityFilingUrl:     "https://www.beian.gov.cn/",
				},
			},
		},
	})
	require.NoError(t, err)
	setting, err := ts.GetInstanceSetting(ctx, &store.FindInstanceSetting{
		Name: storepb.InstanceSettingKey_GENERAL.String(),
	})
	require.NoError(t, err)
	require.Equal(t, instanceSetting, setting)
	ts.Close()
}
