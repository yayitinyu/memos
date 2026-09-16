import type { InstanceSetting_GeneralSetting_LegalNotice } from "@/types/proto/api/v1/instance_service_pb";

export interface LegalNoticeItem {
  key: "icp" | "public-security";
  label: string;
  href?: string;
}

export const getSafeHttpUrl = (value: string): string | undefined => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  try {
    const url = new URL(trimmedValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
};

export const getLegalNoticeItems = (legalNotice?: InstanceSetting_GeneralSetting_LegalNotice): LegalNoticeItem[] => {
  if (!legalNotice) {
    return [];
  }

  const items: LegalNoticeItem[] = [];
  const icpFilingNumber = legalNotice.icpFilingNumber.trim();
  if (legalNotice.displayIcpFiling && icpFilingNumber) {
    items.push({
      key: "icp",
      label: icpFilingNumber,
      href: getSafeHttpUrl(legalNotice.icpFilingUrl),
    });
  }

  const publicSecurityFilingNumber = legalNotice.publicSecurityFilingNumber.trim();
  if (legalNotice.displayPublicSecurityFiling && publicSecurityFilingNumber) {
    items.push({
      key: "public-security",
      label: publicSecurityFilingNumber,
      href: getSafeHttpUrl(legalNotice.publicSecurityFilingUrl),
    });
  }

  return items;
};

export const isPublicContentPath = (pathname: string): boolean => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return (
    normalizedPath === "/" ||
    normalizedPath === "/explore" ||
    /^\/u\/[^/]+$/.test(normalizedPath) ||
    /^\/memos\/[^/]+$/.test(normalizedPath)
  );
};

export const usesMemoExplorerLayout = (pathname: string): boolean => {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return normalizedPath === "/" || normalizedPath === "/explore" || /^\/u\/[^/]+$/.test(normalizedPath);
};
