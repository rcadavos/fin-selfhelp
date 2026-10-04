import { Modal, Pressable, Text, View } from "react-native";

import { ThemeScope } from "@/components/app/theme-root";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * The app's one confirmation modal — the mobile counterpart of the web's
 * `src/components/app/confirm-dialog.tsx`. `Alert.alert` is a no-op on web, so use this.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <ThemeScope>
        <View className="flex-1 items-center justify-center px-6">
          <Pressable
            accessibilityLabel={cancelLabel}
            onPress={onCancel}
            className="absolute inset-0 bg-black/50"
          />
          <View
            accessibilityRole="alert"
            className="w-full max-w-sm gap-5 rounded-lg border border-border bg-popover p-5"
          >
            <View className="gap-2">
              <Text className="text-lg font-semibold text-popover-foreground">{title}</Text>
              {description ? <Text className="text-sm text-muted-foreground">{description}</Text> : null}
            </View>
            <View className="flex-row gap-3">
              <Button label={cancelLabel} variant="outline" onPress={onCancel} className="flex-1" />
              <Button
                label={confirmLabel}
                variant={destructive ? "destructive" : "primary"}
                loading={loading}
                onPress={onConfirm}
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </ThemeScope>
    </Modal>
  );
}
