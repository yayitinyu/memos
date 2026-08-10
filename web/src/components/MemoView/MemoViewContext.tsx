import { createContext, useContext } from "react";
import { useLocation } from "react-router-dom";
import useCurrentUser from "@/hooks/useCurrentUser";
import { State } from "@/types/proto/api/v1/common_pb";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { MemoRelation_Type } from "@/types/proto/api/v1/memo_service_pb";
import type { User } from "@/types/proto/api/v1/user_service_pb";
import { isSuperUser } from "@/utils/user";

export interface MemoViewContextValue {
  memo: Memo;
  creator: User | undefined;
  parentPage: string;
  showNSFWContent: boolean;
  nsfw: boolean;
}

export const MemoViewContext = createContext<MemoViewContextValue | null>(null);

export const useMemoViewContext = (): MemoViewContextValue => {
  const context = useContext(MemoViewContext);
  if (!context) {
    throw new Error("useMemoViewContext must be used within MemoViewContext.Provider");
  }
  return context;
};

export const useMemoViewDerived = () => {
  const { memo } = useMemoViewContext();
  const location = useLocation();
  const currentUser = useCurrentUser();

  const isArchived = memo.state === State.ARCHIVED;
  const readonly = memo.creator !== currentUser?.name && !isSuperUser(currentUser);
  const isInMemoDetailPage = location.pathname.startsWith(`/${memo.name}`);

  const commentAmount = memo.relations.filter(
    (relation) => relation.type === MemoRelation_Type.COMMENT && relation.relatedMemo?.name === memo.name,
  ).length;

  return {
    isArchived,
    readonly,
    isInMemoDetailPage,
    commentAmount,
  };
};
