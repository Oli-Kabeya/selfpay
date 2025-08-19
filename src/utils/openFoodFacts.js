import Fuse from 'fuse.js'; // npm install fuse.js si pas déjà


// Cherche uniquement un produit exact par code-barres
export async function fetchExactProduct(barcode) {
  if (!barcode) return null;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();
    if (data.status === 1) {
      const p = data.product;
      return {
        code: data.code,
        nom: p.product_name || `Produit ${barcode.slice(0,5)}`,
        marque: p.brands || '',
        categorie: p.categories || '',
        prix: Math.floor(Math.random() * 10) + 1
      };
    }
    return null;
  } catch (err) {
    console.error("fetchExactProduct error:", err);
    return null;
  }
}


// utils/openFoodFacts.js

const API_URL = "https://world.openfoodfacts.org/cgi/search.pl";

export async function fetchProductsFromAPI(searchTerm, limit = 20) {
  if (!searchTerm.trim()) return [];

  const params = new URLSearchParams({
    search_terms: searchTerm,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: limit
  });

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`);
    if (!response.ok) throw new Error("Erreur API OpenFoodFacts");
    const data = await response.json();

    if (!data.products) return [];

    // Convertir en format SelfPay
    const produits = data.products.map(p => ({
      nom: p.product_name || p.generic_name || "Produit inconnu",
      prix: Math.floor(Math.random() * 10) + 1, // prix fictif 1 à 10 Fc
      code: p.code || "", // code-barres
      brand: p.brands || "",
      quantity: p.quantity || ""
    }));

    return produits;
  } catch (err) {
    console.error("fetchProductsFromAPI error:", err);
    return [];
  }
}

// Optionnel : fonction pour récupérer un produit exact via code-barres
export async function fetchProductByBarcode(barcode) {
  if (!barcode) return null;
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 1) return null;

    const p = data.product;
    return {
      nom: p.product_name || p.generic_name || `Produit ${barcode.slice(0,5)}`,
      prix: Math.floor(Math.random() * 10) + 1,
      code: barcode,
      brand: p.brands || "",
      quantity: p.quantity || ""
    };
  } catch (err) {
    console.error("fetchProductByBarcode error:", err);
    return null;
  }
}


// utils/openFoodFacts.js

export async function fetchSuggestions(barcode) {
  try {
    // On peut utiliser le paramètre 'search_terms' pour recherche approximative
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${barcode}&search_simple=1&action=process&json=1&page_size=3`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.products || data.products.length === 0) return [];

    // Transformer les données pour correspondre au format panier
    const produits = data.products.map(p => ({
      nom: p.product_name || p.generic_name || `Produit ${barcode.slice(0,5)}`,
      prix: 1, // prix par défaut (tu peux ajouter une logique pour le récupérer)
      code: p.code || barcode,
    }));

    return produits.slice(0, 3);
  } catch (err) {
    console.error("Erreur fetchSuggestions:", err);
    return [];
  }
}

