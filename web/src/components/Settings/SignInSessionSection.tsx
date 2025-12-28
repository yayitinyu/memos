import { timestampDate } from "@bufbuild/protobuf/wkt";
import { TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { userServiceClient } from "@/connect";
import useCurrentUser from "@/hooks/useCurrentUser";
import { UserSetting_Key, UserSetting_RefreshTokensSetting_RefreshToken } from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";
import SettingTable from "./SettingTable";

const SignInSessionSection = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [refreshTokens, setRefreshTokens] = useState<UserSetting_RefreshTokensSetting_RefreshToken[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<UserSetting_RefreshTokensSetting_RefreshToken | undefined>(undefined);

  const listRefreshTokens = async () => {
    if (!currentUser) return [];
    try {
      const setting = await userServiceClient.getUserSetting({
        name: `${currentUser.name}/settings/${UserSetting_Key[UserSetting_Key.REFRESH_TOKENS]}`,
      });
      if (setting.value.case === "refreshTokensSetting") {
        return setting.value.value.refreshTokens;
      }
    } catch (error) {
      // Squelch error if setting is not found, which is possible if no refresh tokens exist or first time
      console.log("Failed to fetch refresh tokens", error);
    }
    return [];
  };

  useEffect(() => {
    listRefreshTokens().then((tokens) => {
      setRefreshTokens(tokens);
    });
  }, [currentUser]);

  const handleDeleteToken = (token: UserSetting_RefreshTokensSetting_RefreshToken) => {
    setDeleteTarget(token);
  };

  const confirmDeleteToken = async () => {
    if (!deleteTarget || !currentUser) return;
    const newTokens = refreshTokens.filter((t) => t.tokenId !== deleteTarget.tokenId);
    try {
      await userServiceClient.updateUserSetting({
        setting: {
          name: `${currentUser.name}/settings/${UserSetting_Key[UserSetting_Key.REFRESH_TOKENS]}`,
          value: {
            case: "refreshTokensSetting",
            value: {
              refreshTokens: newTokens,
            },
          },
        },
        updateMask: { paths: ["refresh_tokens_setting"] },
      });
      setRefreshTokens(newTokens);
      setDeleteTarget(undefined);
      toast.success(t("message.update-succeed"));
    } catch (error) {
      toast.error(t("common.error"));
      console.error("Failed to revoke session", error);
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-medium text-muted-foreground">{t("setting.sign-in-section.title")}</h4>
          <p className="text-xs text-muted-foreground">{t("setting.sign-in-section.description")}</p>
        </div>
      </div>

      <SettingTable
        columns={[
          {
            key: "clientInfo",
            header: t("setting.sign-in-section.device"),
            render: (_, token) => {
              const info = token.clientInfo;
			  if (!info) return <span className="text-muted-foreground">Unknown Device</span>;
              return (
                <div className="flex flex-col">
                  <span className="text-foreground">{info.os} {info.browser}</span>
                  <span className="text-xs text-muted-foreground">{info.deviceType} ({info.ipAddress})</span>
                </div>
              );
            },
          },
          {
            key: "createdAt",
            header: t("setting.sign-in-section.history"),
            render: (_, token) => (token.createdAt ? timestampDate(token.createdAt).toLocaleString() : ""),
          },
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (_, token) => (
              <Button variant="ghost" size="sm" onClick={() => handleDeleteToken(token)}>
                <TrashIcon className="text-destructive w-4 h-auto" />
              </Button>
            ),
          },
        ]}
        data={refreshTokens}
        emptyMessage="No sessions found"
        getRowKey={(token) => token.tokenId}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(undefined)}
        title="Revoke Session"
        description="Are you sure you want to revoke this session?"
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmDeleteToken}
        confirmVariant="destructive"
      />
    </div>
  );
};

export default SignInSessionSection;
