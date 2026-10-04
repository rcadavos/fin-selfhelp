import { Text } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WEB_ROUTES } from "@/lib/constants/app";
import { openWebPath } from "@/lib/utils/open-web";

/** Adding accounts is web-only for now, so the empty state points there. */
export function EmptyAccounts() {
  return (
    <Card className="items-center gap-3 p-6">
      <Text className="text-base font-semibold text-foreground">No accounts yet</Text>
      <Text className="text-center text-sm text-muted-foreground">
        Add your bank accounts, cards and cash on the web — they show up here right away.
      </Text>
      <Button label="Add an account on the web" variant="outline" onPress={() => openWebPath(WEB_ROUTES.accounts)} />
    </Card>
  );
}
