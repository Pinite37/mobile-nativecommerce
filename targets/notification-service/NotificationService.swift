import UserNotifications

// Downloads and attaches the image referenced by the Expo push payload's
// `richContent.image` field (Android renders this natively; on iOS it only
// shows up in the notification tray if this extension attaches it).
//
// NOTE: this was written without the ability to run an EAS build or test on
// a physical device from the environment that authored it — the exact shape
// Expo's push relay uses when forwarding custom fields to APNs was not
// directly verifiable, so this checks several plausible payload locations.
// If the image doesn't show up after a real build/test, log `request.content.userInfo`
// here to see the actual payload shape and adjust `extractImageURLString`.
class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
        self.contentHandler = contentHandler
        bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttemptContent = bestAttemptContent else {
            contentHandler(request.content)
            return
        }

        guard let imageUrlString = NotificationService.extractImageURLString(from: request.content.userInfo),
              let imageUrl = URL(string: imageUrlString) else {
            contentHandler(bestAttemptContent)
            return
        }

        NotificationService.downloadImage(from: imageUrl) { attachment in
            if let attachment = attachment {
                bestAttemptContent.attachments = [attachment]
            }
            contentHandler(bestAttemptContent)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        // Deliver whatever we have (with or without the image) before the OS kills the extension.
        if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
            contentHandler(bestAttemptContent)
        }
    }

    private static func extractImageURLString(from userInfo: [AnyHashable: Any]) -> String? {
        func imageFromRichContent(_ dict: [AnyHashable: Any]?) -> String? {
            guard let richContent = dict else { return nil }
            return richContent["image"] as? String
        }

        // Top-level richContent / _richContent
        if let value = imageFromRichContent(userInfo["richContent"] as? [AnyHashable: Any]) {
            return value
        }
        if let value = imageFromRichContent(userInfo["_richContent"] as? [AnyHashable: Any]) {
            return value
        }

        // Nested under "body" (observed in some Expo push relay payloads)
        if let body = userInfo["body"] as? [AnyHashable: Any] {
            if let value = imageFromRichContent(body["richContent"] as? [AnyHashable: Any]) {
                return value
            }
            if let value = imageFromRichContent(body["_richContent"] as? [AnyHashable: Any]) {
                return value
            }
            // Fallback: our own `data.imageUrl` field, in case richContent isn't relayed at all
            if let data = body["data"] as? [AnyHashable: Any], let imageUrl = data["imageUrl"] as? String {
                return imageUrl
            }
        }

        // Fallback: top-level data.imageUrl
        if let data = userInfo["data"] as? [AnyHashable: Any], let imageUrl = data["imageUrl"] as? String {
            return imageUrl
        }

        return nil
    }

    private static func downloadImage(from url: URL, completion: @escaping (UNNotificationAttachment?) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { (downloadedUrl, _, error) in
            guard let downloadedUrl = downloadedUrl, error == nil else {
                completion(nil)
                return
            }

            let fileManager = FileManager.default
            let tmpDirectory = fileManager.temporaryDirectory
            let fileExtension = url.pathExtension.isEmpty ? "jpg" : url.pathExtension
            let uniqueFileName = ProcessInfo.processInfo.globallyUniqueString + "." + fileExtension
            let tmpFileUrl = tmpDirectory.appendingPathComponent(uniqueFileName)

            do {
                try fileManager.moveItem(at: downloadedUrl, to: tmpFileUrl)
                let attachment = try UNNotificationAttachment(identifier: uniqueFileName, url: tmpFileUrl, options: nil)
                completion(attachment)
            } catch {
                completion(nil)
            }
        }
        task.resume()
    }
}
