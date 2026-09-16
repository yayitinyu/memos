import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";
import { InstanceSetting_GeneralSetting_LegalNoticeSchema } from "@/types/proto/api/v1/instance_service_pb";
import { getLegalNoticeItems, getSafeHttpUrl, isPublicContentPath, usesMemoExplorerLayout } from "./legal-notice";

describe("getSafeHttpUrl", () => {
  it("accepts only HTTP and HTTPS URLs", () => {
    expect(getSafeHttpUrl(" https://beian.miit.gov.cn/ ")).toBe("https://beian.miit.gov.cn/");
    expect(getSafeHttpUrl("http://www.beian.gov.cn")).toBe("http://www.beian.gov.cn/");
    expect(getSafeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(getSafeHttpUrl("not-a-url")).toBeUndefined();
  });
});

describe("getLegalNoticeItems", () => {
  it("returns enabled, non-empty filing records and ignores unsafe links", () => {
    const legalNotice = create(InstanceSetting_GeneralSetting_LegalNoticeSchema, {
      displayIcpFiling: true,
      icpFilingNumber: " 京ICP备12345678号 ",
      icpFilingUrl: "https://beian.miit.gov.cn/",
      displayPublicSecurityFiling: true,
      publicSecurityFilingNumber: "京公网安备 11010502000000号",
      publicSecurityFilingUrl: "javascript:alert(1)",
    });

    expect(getLegalNoticeItems(legalNotice)).toEqual([
      {
        key: "icp",
        label: "京ICP备12345678号",
        href: "https://beian.miit.gov.cn/",
      },
      {
        key: "public-security",
        label: "京公网安备 11010502000000号",
        href: undefined,
      },
    ]);
  });

  it("omits disabled and empty filing records", () => {
    const legalNotice = create(InstanceSetting_GeneralSetting_LegalNoticeSchema, {
      displayIcpFiling: false,
      icpFilingNumber: "京ICP备12345678号",
      displayPublicSecurityFiling: true,
      publicSecurityFilingNumber: "   ",
    });

    expect(getLegalNoticeItems(legalNotice)).toEqual([]);
  });
});

describe("public legal notice routes", () => {
  it("matches only public content pages", () => {
    expect(isPublicContentPath("/")).toBe(true);
    expect(isPublicContentPath("/explore/")).toBe(true);
    expect(isPublicContentPath("/u/alice")).toBe(true);
    expect(isPublicContentPath("/memos/example-id")).toBe(true);
    expect(isPublicContentPath("/setting")).toBe(false);
    expect(isPublicContentPath("/auth")).toBe(false);
    expect(isPublicContentPath("/404")).toBe(false);
  });

  it("identifies routes that reserve space for the memo explorer", () => {
    expect(usesMemoExplorerLayout("/explore")).toBe(true);
    expect(usesMemoExplorerLayout("/u/alice")).toBe(true);
    expect(usesMemoExplorerLayout("/memos/example-id")).toBe(false);
  });
});
