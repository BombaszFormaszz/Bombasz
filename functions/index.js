const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.database();
const messaging = admin.messaging();

/**
 * Firebase Cloud Function - Push értesítés küldése új chat üzenetkor
 * 
 * Triggerelődik amikor új üzenet kerül a /chats/{chatId}/{messageId} útvonalra
 */
exports.sendChatNotification = functions.database
    .ref("/chats/{chatId}/{messageId}")
    .onCreate(async (snapshot, context) => {
        const message = snapshot.val();
        const chatId = context.params.chatId;
        const messageId = context.params.messageId;

        console.log(`New message in chat ${chatId}:`, message);

        // Üzenet adatok
        const senderId = message.senderId;
        const messageText = message.text;

        if (!senderId || !messageText) {
            console.log("Missing senderId or text, skipping notification");
            return null;
        }

        // ChatId formátum: "uid1_uid2" (rendezve)
        const userIds = chatId.split("_");
        if (userIds.length !== 2) {
            console.log("Invalid chatId format:", chatId);
            return null;
        }

        // Megkeressük a címzettet (aki NEM a küldő)
        const recipientId = userIds[0] === senderId ? userIds[1] : userIds[0];

        console.log(`Sender: ${senderId}, Recipient: ${recipientId}`);

        try {
            // Küldő nevének lekérése
            const senderSnapshot = await db.ref(`users/${senderId}`).once("value");
            const senderData = senderSnapshot.val();
            const senderName = senderData?.username || senderData?.displayName || "Valaki";

            // Címzett FCM tokenjének lekérése
            const tokensSnapshot = await db.ref(`fcm_tokens/${recipientId}`).once("value");
            const tokensData = tokensSnapshot.val();

            if (!tokensData) {
                console.log(`No FCM tokens found for user ${recipientId}`);
                return null;
            }

            // Összegyűjtjük az összes token-t (több eszköz is lehet)
            const tokens = Object.values(tokensData)
                .map(t => t.token)
                .filter(t => t);

            if (tokens.length === 0) {
                console.log("No valid tokens found");
                return null;
            }

            console.log(`Sending notification to ${tokens.length} device(s)`);

            // Notification payload
            const payload = {
                notification: {
                    title: senderName,
                    body: messageText.length > 100 
                        ? messageText.substring(0, 100) + "..." 
                        : messageText,
                },
                data: {
                    chatId: chatId,
                    senderId: senderId,
                    senderName: senderName,
                    messageId: messageId,
                    click_action: "OPEN_CHAT"
                },
                // Android specifikus beállítások
                android: {
                    priority: "high",
                    notification: {
                        icon: "ic_notification",
                        color: "#FFFFFF",
                        sound: "default",
                        channelId: "chat_messages"
                    }
                },
                // iOS specifikus beállítások (APNs)
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: senderName,
                                body: messageText.length > 100 
                                    ? messageText.substring(0, 100) + "..." 
                                    : messageText
                            },
                            sound: "default",
                            badge: 1
                        }
                    }
                },
                // Web specifikus beállítások
                webpush: {
                    notification: {
                        icon: "/img/icon-192.png",
                        badge: "/img/icon-192.png",
                        vibrate: [200, 100, 200],
                        requireInteraction: false
                    },
                    fcmOptions: {
                        link: "/social.html"
                    }
                }
            };

            // Küldés minden eszközre
            const response = await messaging.sendEachForMulticast({
                tokens: tokens,
                ...payload
            });

            console.log(`Successfully sent: ${response.successCount}, Failed: ${response.failureCount}`);

            // Érvénytelen tokenek törlése
            if (response.failureCount > 0) {
                const tokensToRemove = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        if (errorCode === "messaging/invalid-registration-token" ||
                            errorCode === "messaging/registration-token-not-registered") {
                            // Megkeressük melyik token volt ez
                            const tokenEntries = Object.entries(tokensData);
                            if (tokenEntries[idx]) {
                                tokensToRemove.push(tokenEntries[idx][0]);
                            }
                        }
                        console.log(`Error for token ${idx}:`, resp.error);
                    }
                });

                // Érvénytelen tokenek törlése az adatbázisból
                for (const tokenKey of tokensToRemove) {
                    await db.ref(`fcm_tokens/${recipientId}/${tokenKey}`).remove();
                    console.log(`Removed invalid token: ${tokenKey}`);
                }
            }

            return response;

        } catch (error) {
            console.error("Error sending notification:", error);
            return null;
        }
    });

/**
 * Barát kérés értesítés
 */
exports.sendFriendRequestNotification = functions.database
    .ref("/friend_requests/{userId}/{fromUserId}")
    .onCreate(async (snapshot, context) => {
        const request = snapshot.val();
        const recipientId = context.params.userId;
        const senderId = context.params.fromUserId;

        console.log(`Friend request from ${senderId} to ${recipientId}`);

        try {
            const senderName = request.fromName || "Valaki";

            // Címzett FCM tokenjének lekérése
            const tokensSnapshot = await db.ref(`fcm_tokens/${recipientId}`).once("value");
            const tokensData = tokensSnapshot.val();

            if (!tokensData) {
                console.log(`No FCM tokens found for user ${recipientId}`);
                return null;
            }

            const tokens = Object.values(tokensData)
                .map(t => t.token)
                .filter(t => t);

            if (tokens.length === 0) {
                return null;
            }

            const payload = {
                notification: {
                    title: "Új barát kérés!",
                    body: `${senderName} barátnak jelölt téged`
                },
                data: {
                    type: "friend_request",
                    senderId: senderId,
                    senderName: senderName
                },
                android: {
                    priority: "high",
                    notification: {
                        icon: "ic_notification",
                        color: "#4bff4b",
                        sound: "default"
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: "Új barát kérés!",
                                body: `${senderName} barátnak jelölt téged`
                            },
                            sound: "default",
                            badge: 1
                        }
                    }
                },
                webpush: {
                    notification: {
                        icon: "/img/icon-192.png",
                        vibrate: [200, 100, 200]
                    },
                    fcmOptions: {
                        link: "/social.html"
                    }
                }
            };

            const response = await messaging.sendEachForMulticast({
                tokens: tokens,
                ...payload
            });

            console.log(`Friend request notification sent: ${response.successCount} success`);
            return response;

        } catch (error) {
            console.error("Error sending friend request notification:", error);
            return null;
        }
    });
