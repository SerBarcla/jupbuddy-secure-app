import {onUserCreated, AuthEvent} from "firebase-functions/v2/auth";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();
const db = admin.firestore();

const SUPER_ADMINS = [
    "batlang.mahatlane@redpathmining.com",
    "mbatlang1@gmail.com",
];

export const onusercreate = onUserCreated(async (event: AuthEvent) => {
    // In v2, the user data is available in the event.data object
    const user = event.data;

    if (!user.email) {
        logger.log("User has no email, exiting.", user.uid);
        return;
    }

    const customClaims: { [key: string]: boolean } = {};
    let systemRole = "Operator";

    if (SUPER_ADMINS.includes(user.email)) {
        customClaims.superAdmin = true;
        systemRole = "Super Admin";
        logger.log(`Granting Super Admin access to ${user.email}`);
    }

    await admin.auth().setCustomUserClaims(user.uid, customClaims);

    const userProfile = {
        userId: user.uid,
        email: user.email,
        name: user.displayName || user.email.split("@")[0],
        systemRole: systemRole,
        operationalRole: "Not Set",
        profileComplete: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("users").doc(user.uid).set(userProfile);

    logger.log(`User profile created for ${user.email}`);
});