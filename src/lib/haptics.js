// A light tap on iPhone at the moments that matter: the ranking lands, an ask
// is ticked, an order is placed. No-op on the web and if the plugin is absent.
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { isNative } from "./purchases.js";

export function tap() {
  if (isNative()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

export function success() {
  if (isNative()) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}
