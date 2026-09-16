import { useLocation } from "react-router-dom";
import { useInstance } from "@/contexts/InstanceContext";
import useCurrentUser from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { getLegalNoticeItems, isPublicContentPath, usesMemoExplorerLayout } from "@/utils/legal-notice";

const PublicFooter = () => {
  const { pathname } = useLocation();
  const currentUser = useCurrentUser();
  const { generalSetting } = useInstance();

  if (currentUser || !isPublicContentPath(pathname)) {
    return null;
  }

  const items = getLegalNoticeItems(generalSetting.legalNotice);
  if (items.length === 0) {
    return null;
  }

  return (
    <footer
      className={cn(
        "mt-auto w-full px-4 pt-3 pb-6 text-xs text-muted-foreground",
        usesMemoExplorerLayout(pathname) && "md:pl-56 md:pr-6 lg:pl-72",
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center">
        {items.map((item) =>
          item.href ? (
            <a
              key={item.key}
              className="max-w-full break-words rounded-sm hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item.label}
            </a>
          ) : (
            <span key={item.key} className="max-w-full break-words">
              {item.label}
            </span>
          ),
        )}
      </div>
    </footer>
  );
};

export default PublicFooter;
