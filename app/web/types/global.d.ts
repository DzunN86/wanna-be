export interface IPushNotificationSchema {
    /**
     * The notification title.
     *
     * @since 1.0.0
     */
    title?: string;
  
    /**
     * The notification subtitle.
     *
     * @since 1.0.0
     */
    subtitle?: string;
  
    /**
     * The main text payload for the notification.
     *
     * @since 1.0.0
     */
    body?: string;
  
    /**
     * The notification identifier.
     *
     * @since 1.0.0
     */
    id: string;
  
    /**
     * The number to display for the app icon badge.
     *
     * @since 1.0.0
     */
    badge?: number;
  
    /**
     * It's not being returned.
     *
     * @deprecated will be removed in next major version.
     * @since 1.0.0
     */
    notification?: any;
  
    /**
     * Any additional data that was included in the
     * push notification payload.
     *
     * @since 1.0.0
     */
    data: any;
  
    /**
     * The action to be performed on the user opening the notification.
     *
     * Only available on Android.
     *
     * @since 1.0.0
     */
    click_action?: string;
  
    /**
     * Deep link from the notification.
     *
     * Only available on Android.
     *
     * @since 1.0.0
     */
    link?: string;
  
    /**
     * Set the group identifier for notification grouping.
     *
     * Only available on Android. Works like `threadIdentifier` on iOS.
     *
     * @since 1.0.0
     */
    group?: string;
  
    /**
     * Designate this notification as the summary for an associated `group`.
     *
     * Only available on Android.
     *
     * @since 1.0.0
     */
    groupSummary?: boolean;

    isRead?: boolean;
  }

  export interface IActionPerformed {
    /**
     * The action performed on the notification.
     *
     * @since 1.0.0
     */
    actionId: string;
  
    /**
     * Text entered on the notification action.
     *
     * Only available on iOS.
     *
     * @since 1.0.0
     */
    inputValue?: string;
  
    /**
     * The notification in which the action was performed.
     *
     * @since 1.0.0
     */
    notification: IPushNotificationSchema;
  }