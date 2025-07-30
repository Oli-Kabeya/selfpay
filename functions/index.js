const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Fonction pour ajouter un rôle admin à un utilisateur
exports.addAdminRole = functions.https.onCall(async (data, context) => {
  // Vérifie que l'appel vient déjà d'un admin
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les admins peuvent ajouter un autre admin"
    );
  }

  const email = data.email;

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    return { message: `Admin ajouté à ${email}` };
  } catch (error) {
    throw new functions.https.HttpsError("unknown", error.message, error);
  }
});
