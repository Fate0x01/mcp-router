import React, { forwardRef, useImperativeHandle, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@mcp_router/ui";
import { Button } from "@mcp_router/ui";
import { ScrollArea } from "@mcp_router/ui";

interface HowToUseProps {
  token?: string;
}

export interface HowToUseHandle {
  showDialog: () => void;
}

// Content component using i18n
const HowToUseContent: React.FC<HowToUseProps> = ({ token }) => {
  const { t } = useTranslation();

  return (
    <>
      {/* CLI Usage */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3">
          {t("mcpApps.howToUseDialog.cliUsageTitle")}
        </h4>
        <p className="mb-3 text-muted-foreground">
          {token
            ? t("mcpApps.howToUseDialog.cliUsageDescriptionWithToken")
            : t("mcpApps.howToUseDialog.cliUsageDescriptionNoToken")}
        </p>
        <div className="overflow-x-auto w-full">
          <pre className="bg-muted p-4 rounded-lg text-xs whitespace-pre min-w-min w-max">
            {token
              ? `${t("mcpApps.howToUseDialog.exportTokenComment")}
export MCPR_TOKEN="${token}"

npx -y @mcp_router/cli@latest connect`
              : `npx -y @mcp_router/cli@latest connect`}
          </pre>
        </div>
      </div>

      {/* Config File Usage */}
      <div className="mb-6">
        <h4 className="text-md font-semibold mb-3">
          {t("mcpApps.howToUseDialog.configUsageTitle")}
        </h4>
        <p className="mb-3 text-muted-foreground">
          {t("mcpApps.howToUseDialog.configUsageDescription")}
        </p>
        <div className="overflow-x-auto w-full">
          <pre className="bg-muted p-4 rounded-lg text-xs whitespace-pre min-w-min w-max">
            {`{
  "mcpServers": {
    "mcp-router": {
      "command": "npx",
      "args": [
        "-y",
        "@mcp_router/cli@latest",
        "connect"
      ],
      "env": {
        "MCPR_TOKEN": "${token}"
      }
    }
  }
}`}
          </pre>
        </div>
      </div>
    </>
  );
};

// Main component with dialog
const HowToUse = forwardRef<HowToUseHandle, HowToUseProps>(({ token }, ref) => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    showDialog: () => setIsDialogOpen(true),
  }));

  return (
    <>
      {/* Inline display when used directly */}
      {!isDialogOpen && <HowToUseContent token={token} />}

      {/* Dialog version */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[100vw] mx-auto flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("mcpApps.howToUse")}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] overflow-auto">
            <HowToUseContent token={token} />
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

HowToUse.displayName = "HowToUse";

export default HowToUse;
