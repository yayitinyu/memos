import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { identityProviderServiceClient, userServiceClient } from "@/connect";
import { extractIdentityProviderIdFromName } from "@/helpers/resource-names";
import { absolutifyLink } from "@/helpers/utils";
import useCurrentUser from "@/hooks/useCurrentUser";
import { handleError } from "@/lib/error";
import { IdentityProvider, IdentityProvider_Type } from "@/types/proto/api/v1/idp_service_pb";
import { LinkedIdentity } from "@/types/proto/api/v1/user_service_pb";
import { useTranslate } from "@/utils/i18n";
import { storeOAuthState } from "@/utils/oauth";
import SettingGroup from "./SettingGroup";
import SettingTable from "./SettingTable";

interface LinkedIdentityRow extends Record<string, unknown> {
  name: string;
  title: string;
  externUid: string;
  isLinked: boolean;
  linkedIdentity?: LinkedIdentity;
  identityProvider: IdentityProvider;
}

const LinkedIdentitySection = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [identityProviderList, setIdentityProviderList] = useState<IdentityProvider[]>([]);
  const [linkedIdentityList, setLinkedIdentityList] = useState<LinkedIdentity[]>([]);

  const fetchData = async () => {
    if (!currentUser?.name) {
      return;
    }
    const [{ identityProviders }, { linkedIdentities }] = await Promise.all([
      identityProviderServiceClient.listIdentityProviders({}),
      userServiceClient.listLinkedIdentities({ parent: currentUser.name }),
    ]);
    setIdentityProviderList(identityProviders);
    setLinkedIdentityList(linkedIdentities);
  };

  useEffect(() => {
    if (!currentUser?.name) {
      return;
    }
    fetchData().catch((error: unknown) => {
      handleError(error, toast.error, {
        context: "Load linked identities",
      });
    });
  }, [currentUser?.name]);

  const oauthIdentityProviders = useMemo(
    () => identityProviderList.filter((identityProvider) => identityProvider.type === IdentityProvider_Type.OAUTH2),
    [identityProviderList],
  );

  const linkedIdentityByProviderName = useMemo(() => {
    const mapping = new Map<string, LinkedIdentity>();
    for (const linkedIdentity of linkedIdentityList) {
      if (!mapping.has(linkedIdentity.idpName)) {
        mapping.set(linkedIdentity.idpName, linkedIdentity);
      }
    }
    return mapping;
  }, [linkedIdentityList]);

  const rows = useMemo<LinkedIdentityRow[]>(
    () =>
      oauthIdentityProviders.map((identityProvider) => {
        const linkedIdentity = linkedIdentityByProviderName.get(identityProvider.name);
        return {
          name: identityProvider.name,
          title: identityProvider.title,
          externUid: linkedIdentity?.externUid ?? "",
          isLinked: !!linkedIdentity,
          linkedIdentity,
          identityProvider,
        };
      }),
    [linkedIdentityByProviderName, oauthIdentityProviders],
  );

  const handleLinkIdentityProvider = async (identityProvider: IdentityProvider) => {
    if (!currentUser?.name) {
      return;
    }
    const redirectUri = absolutifyLink("/auth/callback");
    const oauth2Config = identityProvider.config?.config?.case === "oauth2Config" ? identityProvider.config.config.value : undefined;
    if (!oauth2Config) {
      toast.error("Identity provider configuration is invalid.");
      return;
    }

    try {
      const returnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const identityProviderId = extractIdentityProviderIdFromName(identityProvider.name);
      const { state, codeChallenge } = await storeOAuthState(identityProviderId, "link", returnUrl, currentUser.name);

      const authUrl = `${oauth2Config.authUrl}?client_id=${
        oauth2Config.clientId
      }&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&scope=${encodeURIComponent(
        oauth2Config.scopes.join(" "),
      )}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      window.location.href = authUrl;
    } catch (error) {
      handleError(error, toast.error, {
        context: "Failed to initiate OAuth flow",
        fallbackMessage: "Failed to initiate account linking. Please try again.",
      });
    }
  };

  const handleUnlinkIdentityProvider = async (row: LinkedIdentityRow) => {
    if (!row.linkedIdentity?.name) {
      return;
    }
    try {
      await userServiceClient.deleteLinkedIdentity({
        name: row.linkedIdentity.name,
      });
      await fetchData();
      toast.success(t("setting.sso-section.unlink-success", { name: row.title }));
    } catch (error) {
      handleError(error, toast.error, {
        context: "Delete linked identity",
        fallbackMessage: "Failed to unlink identity provider.",
      });
    }
  };

  if (oauthIdentityProviders.length === 0) {
    return null;
  }

  return (
    <SettingGroup showSeparator title={t("setting.sso-section.accounts-title")} description={t("setting.sso-section.accounts-description")}>
      <SettingTable<LinkedIdentityRow>
        columns={[
          {
            key: "title",
            header: t("setting.sso-section.provider"),
            render: (_, row) => <span className="text-sm font-medium text-foreground">{row.title}</span>,
          },
          {
            key: "externUid",
            header: t("setting.sso-section.account"),
            render: (_, row) => (
              <div className="flex flex-col gap-1">
                <Badge variant={row.isLinked ? "default" : "outline"}>
                  {row.isLinked ? t("setting.sso-section.linked") : t("setting.sso-section.not-linked")}
                </Badge>
                {row.isLinked && row.externUid ? <span className="text-xs text-muted-foreground">{row.externUid}</span> : null}
              </div>
            ),
          },
          {
            key: "actions",
            header: "",
            className: "w-px text-right",
            render: (_, row) =>
              row.linkedIdentity ? (
                <Button variant="outline" size="sm" onClick={() => handleUnlinkIdentityProvider(row)}>
                  {t("setting.sso-section.unlink")}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => handleLinkIdentityProvider(row.identityProvider)}>
                  {t("setting.sso-section.link")}
                </Button>
              ),
          },
        ]}
        data={rows}
        emptyMessage={t("setting.sso-section.no-sso-found")}
        getRowKey={(row) => row.name}
      />
    </SettingGroup>
  );
};

export default LinkedIdentitySection;
