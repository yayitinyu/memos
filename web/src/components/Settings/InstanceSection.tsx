import { create } from "@bufbuild/protobuf";
import { isEqual } from "lodash-es";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { identityProviderServiceClient } from "@/connect";
import { useInstance } from "@/contexts/InstanceContext";
import useDialog from "@/hooks/useDialog";
import { handleError } from "@/lib/error";
import { IdentityProvider } from "@/types/proto/api/v1/idp_service_pb";
import {
  InstanceSetting_GeneralSetting,
  InstanceSetting_GeneralSetting_LegalNotice,
  InstanceSetting_GeneralSetting_LegalNoticeSchema,
  InstanceSetting_GeneralSettingSchema,
  InstanceSetting_Key,
  InstanceSettingSchema,
} from "@/types/proto/api/v1/instance_service_pb";
import { useTranslate } from "@/utils/i18n";
import { getSafeHttpUrl } from "@/utils/legal-notice";
import UpdateCustomizedProfileDialog from "../UpdateCustomizedProfileDialog";
import SettingGroup from "./SettingGroup";
import SettingRow from "./SettingRow";
import SettingSection from "./SettingSection";

type LegalNoticeUpdate = Partial<
  Pick<
    InstanceSetting_GeneralSetting_LegalNotice,
    | "displayIcpFiling"
    | "icpFilingNumber"
    | "icpFilingUrl"
    | "displayPublicSecurityFiling"
    | "publicSecurityFilingNumber"
    | "publicSecurityFilingUrl"
  >
>;

const InstanceSection = () => {
  const t = useTranslate();
  const customizeDialog = useDialog();
  const { generalSetting: originalSetting, profile, updateSetting, fetchSetting } = useInstance();
  const [instanceGeneralSetting, setInstanceGeneralSetting] = useState<InstanceSetting_GeneralSetting>(originalSetting);
  const [identityProviderList, setIdentityProviderList] = useState<IdentityProvider[]>([]);

  useEffect(() => {
    setInstanceGeneralSetting({ ...instanceGeneralSetting, customProfile: originalSetting.customProfile });
  }, [originalSetting]);

  const handleUpdateCustomizedProfileButtonClick = () => {
    customizeDialog.open();
  };

  const updatePartialSetting = (partial: Partial<InstanceSetting_GeneralSetting>) => {
    setInstanceGeneralSetting(
      create(InstanceSetting_GeneralSettingSchema, {
        ...instanceGeneralSetting,
        ...partial,
      }),
    );
  };

  const updateLegalNotice = (partial: LegalNoticeUpdate) => {
    const currentLegalNotice = instanceGeneralSetting.legalNotice ?? create(InstanceSetting_GeneralSetting_LegalNoticeSchema, {});
    updatePartialSetting({
      legalNotice: create(InstanceSetting_GeneralSetting_LegalNoticeSchema, {
        ...currentLegalNotice,
        ...partial,
      }),
    });
  };

  const handleSaveGeneralSetting = async () => {
    const normalizedLegalNotice = instanceGeneralSetting.legalNotice
      ? create(InstanceSetting_GeneralSetting_LegalNoticeSchema, {
          ...instanceGeneralSetting.legalNotice,
          icpFilingNumber: instanceGeneralSetting.legalNotice.icpFilingNumber.trim(),
          icpFilingUrl: instanceGeneralSetting.legalNotice.icpFilingUrl.trim(),
          publicSecurityFilingNumber: instanceGeneralSetting.legalNotice.publicSecurityFilingNumber.trim(),
          publicSecurityFilingUrl: instanceGeneralSetting.legalNotice.publicSecurityFilingUrl.trim(),
        })
      : undefined;

    if (normalizedLegalNotice?.displayIcpFiling && !normalizedLegalNotice.icpFilingNumber) {
      toast.error(t("setting.instance-section.filing-number-required", { type: "ICP" }));
      return;
    }
    if (normalizedLegalNotice?.displayPublicSecurityFiling && !normalizedLegalNotice.publicSecurityFilingNumber) {
      toast.error(t("setting.instance-section.filing-number-required", { type: t("setting.instance-section.public-security") }));
      return;
    }
    if (normalizedLegalNotice?.icpFilingUrl && !getSafeHttpUrl(normalizedLegalNotice.icpFilingUrl)) {
      toast.error(t("setting.instance-section.filing-url-invalid", { type: "ICP" }));
      return;
    }
    if (normalizedLegalNotice?.publicSecurityFilingUrl && !getSafeHttpUrl(normalizedLegalNotice.publicSecurityFilingUrl)) {
      toast.error(t("setting.instance-section.filing-url-invalid", { type: t("setting.instance-section.public-security") }));
      return;
    }

    const normalizedSetting = create(InstanceSetting_GeneralSettingSchema, {
      ...instanceGeneralSetting,
      legalNotice: normalizedLegalNotice,
    });

    try {
      await updateSetting(
        create(InstanceSettingSchema, {
          name: `instance/settings/${InstanceSetting_Key[InstanceSetting_Key.GENERAL]}`,
          value: {
            case: "generalSetting",
            value: normalizedSetting,
          },
        }),
      );
      setInstanceGeneralSetting(normalizedSetting);
      await fetchSetting(InstanceSetting_Key.GENERAL);
    } catch (error: unknown) {
      await handleError(error, toast.error, {
        context: "Update general settings",
      });
      return;
    }
    toast.success(t("message.update-succeed"));
  };

  useEffect(() => {
    fetchIdentityProviderList();
  }, []);

  const fetchIdentityProviderList = async () => {
    const { identityProviders } = await identityProviderServiceClient.listIdentityProviders({});
    setIdentityProviderList(identityProviders);
  };

  return (
    <SettingSection>
      <SettingGroup title={t("common.basic")}>
        <SettingRow label={t("setting.system-section.server-name")} description={instanceGeneralSetting.customProfile?.title || "Memos"}>
          <Button variant="outline" onClick={handleUpdateCustomizedProfileButtonClick}>
            {t("common.edit")}
          </Button>
        </SettingRow>
      </SettingGroup>

      <SettingGroup title={t("setting.system-section.title")} showSeparator>
        <SettingRow label={t("setting.system-section.additional-style")} vertical>
          <Textarea
            className="font-mono w-full"
            rows={3}
            placeholder={t("setting.system-section.additional-style-placeholder")}
            value={instanceGeneralSetting.additionalStyle}
            onChange={(event) => updatePartialSetting({ additionalStyle: event.target.value })}
          />
        </SettingRow>

        <SettingRow label={t("setting.system-section.additional-script")} vertical>
          <Textarea
            className="font-mono w-full"
            rows={3}
            placeholder={t("setting.system-section.additional-script-placeholder")}
            value={instanceGeneralSetting.additionalScript}
            onChange={(event) => updatePartialSetting({ additionalScript: event.target.value })}
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup>
        <SettingRow label={t("setting.instance-section.disallow-user-registration")}>
          <Switch
            disabled={profile.mode === "demo"}
            checked={instanceGeneralSetting.disallowUserRegistration}
            onCheckedChange={(checked) => updatePartialSetting({ disallowUserRegistration: checked })}
          />
        </SettingRow>

        <SettingRow label={t("setting.instance-section.disallow-password-auth")}>
          <Switch
            disabled={profile.mode === "demo" || (identityProviderList.length === 0 && !instanceGeneralSetting.disallowPasswordAuth)}
            checked={instanceGeneralSetting.disallowPasswordAuth}
            onCheckedChange={(checked) => updatePartialSetting({ disallowPasswordAuth: checked })}
          />
        </SettingRow>

        <SettingRow label={t("setting.instance-section.disallow-change-username")}>
          <Switch
            checked={instanceGeneralSetting.disallowChangeUsername}
            onCheckedChange={(checked) => updatePartialSetting({ disallowChangeUsername: checked })}
          />
        </SettingRow>

        <SettingRow label={t("setting.instance-section.disallow-change-nickname")}>
          <Switch
            checked={instanceGeneralSetting.disallowChangeNickname}
            onCheckedChange={(checked) => updatePartialSetting({ disallowChangeNickname: checked })}
          />
        </SettingRow>

        <SettingRow label={t("setting.instance-section.week-start-day")}>
          <Select
            value={instanceGeneralSetting.weekStartDayOffset.toString()}
            onValueChange={(value) => {
              updatePartialSetting({ weekStartDayOffset: parseInt(value) || 0 });
            }}
          >
            <SelectTrigger className="min-w-fit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="-1">{t("setting.instance-section.saturday")}</SelectItem>
              <SelectItem value="0">{t("setting.instance-section.sunday")}</SelectItem>
              <SelectItem value="1">{t("setting.instance-section.monday")}</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingGroup>

      <SettingGroup
        title={t("setting.instance-section.public-filing")}
        description={t("setting.instance-section.public-filing-description")}
        showSeparator
      >
        <div className="flex flex-col gap-3">
          <SettingRow label={t("setting.instance-section.display-icp-filing")}>
            <Switch
              checked={instanceGeneralSetting.legalNotice?.displayIcpFiling ?? false}
              onCheckedChange={(checked) => updateLegalNotice({ displayIcpFiling: checked })}
            />
          </SettingRow>
          {instanceGeneralSetting.legalNotice?.displayIcpFiling && (
            <div className="ml-1 flex flex-col gap-3 border-l border-border pl-3 sm:ml-3">
              <SettingRow label={t("setting.instance-section.icp-filing-number")} vertical>
                <Input
                  className="max-w-xl"
                  placeholder={t("setting.instance-section.icp-filing-number-placeholder")}
                  value={instanceGeneralSetting.legalNotice.icpFilingNumber}
                  onChange={(event) => updateLegalNotice({ icpFilingNumber: event.target.value })}
                />
              </SettingRow>
              <SettingRow label={t("setting.instance-section.icp-filing-url")} vertical>
                <Input
                  className="max-w-xl"
                  type="url"
                  inputMode="url"
                  placeholder="https://beian.miit.gov.cn/"
                  value={instanceGeneralSetting.legalNotice.icpFilingUrl}
                  onChange={(event) => updateLegalNotice({ icpFilingUrl: event.target.value })}
                />
              </SettingRow>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/60 pt-3">
          <SettingRow label={t("setting.instance-section.display-public-security-filing")}>
            <Switch
              checked={instanceGeneralSetting.legalNotice?.displayPublicSecurityFiling ?? false}
              onCheckedChange={(checked) => updateLegalNotice({ displayPublicSecurityFiling: checked })}
            />
          </SettingRow>
          {instanceGeneralSetting.legalNotice?.displayPublicSecurityFiling && (
            <div className="ml-1 flex flex-col gap-3 border-l border-border pl-3 sm:ml-3">
              <SettingRow label={t("setting.instance-section.public-security-filing-number")} vertical>
                <Input
                  className="max-w-xl"
                  placeholder={t("setting.instance-section.public-security-filing-number-placeholder")}
                  value={instanceGeneralSetting.legalNotice.publicSecurityFilingNumber}
                  onChange={(event) => updateLegalNotice({ publicSecurityFilingNumber: event.target.value })}
                />
              </SettingRow>
              <SettingRow label={t("setting.instance-section.public-security-filing-url")} vertical>
                <Input
                  className="max-w-xl"
                  type="url"
                  inputMode="url"
                  placeholder="https://www.beian.gov.cn/"
                  value={instanceGeneralSetting.legalNotice.publicSecurityFilingUrl}
                  onChange={(event) => updateLegalNotice({ publicSecurityFilingUrl: event.target.value })}
                />
              </SettingRow>
            </div>
          )}
        </div>
      </SettingGroup>

      <div className="w-full flex justify-end">
        <Button disabled={isEqual(instanceGeneralSetting, originalSetting)} onClick={handleSaveGeneralSetting}>
          {t("common.save")}
        </Button>
      </div>

      <UpdateCustomizedProfileDialog
        open={customizeDialog.isOpen}
        onOpenChange={customizeDialog.setOpen}
        onSuccess={() => {
          // Refresh instance settings if needed
          toast.success("Profile updated successfully!");
        }}
      />
    </SettingSection>
  );
};

export default InstanceSection;
