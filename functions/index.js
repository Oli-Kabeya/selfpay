const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

exports.addAdminRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les admins peuvent ajouter un autre admin"
    );
  }

  const email = data.email;
  if (!email || typeof email !== 'string') {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Adresse email invalide ou manquante"
    );
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    return { message: `Admin ajouté à ${email}` };
  } catch (error) {
    throw new functions.https.HttpsError(
      "not-found",
      `Utilisateur avec email ${email} non trouvé.`,
      error
    );
  }
});

exports.ajouterProduitSansCode = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Seuls les admins peuvent ajouter un produit sans code."
    );
  }

  // Vérifications des champs
  if (
    !data.nom || typeof data.nom !== 'string' ||
    !data.categorie || typeof data.categorie !== 'string' ||
    data.prix === undefined || typeof data.prix !== 'number' || data.prix < 0 ||
    !data.description || typeof data.description !== 'string' ||
    !data.imageUrl || typeof data.imageUrl !== 'string'
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Champs requis manquants ou invalides.'
    );
  }

  // (Optionnel) Validation simple URL image (regex basique)
  const urlPattern = /^https?:\/\/.+/;
  if (!urlPattern.test(data.imageUrl)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'imageUrl doit être une URL valide commençant par http(s).'
    );
  }

  const productId = data.productId || db.collection('produits_sans_codes').doc().id;

  try {
    await db.collection('produits_sans_codes').doc(productId).set({
      nom: data.nom,
      categorie: data.categorie,
      prix: data.prix,
      description: data.description,
      imageUrl: data.imageUrl,
      dateCreation: admin.firestore.Timestamp.now()
    });
  } catch (error) {
    throw new functions.https.HttpsError(
      'unknown',
      'Erreur lors de l\'ajout du produit sans code.',
      error
    );
  }

  return { success: true, productId };
});
