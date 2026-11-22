// Favourite exercises. Stored in the app state so they sync with the account
// (see sync/domains.js pushFavorites / pullFavorites).
import Store from "./store/gymakStore";
export function getFavs() { return new Set(Store.getFavoriteIds()); }
export function toggleFav(id) { Store.toggleFavorite(id); return getFavs(); }
