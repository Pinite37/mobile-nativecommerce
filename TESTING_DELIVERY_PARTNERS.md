# Tests manuels – Partenaires de livraison

## 1. Liste with-status

- Ouvrir l'écran Partenaires de livraison.
- Vérifier que les compteurs Total / Associés / Disponibles s'affichent.
- Confirmer que le nombre "Associés" augmente après association.
- Vérifier qu'un badge "Associé" apparaît sans rechargement après clic.
- Vérifier badge ✔ (Vérifié) présent si `isVerified=true`.

## 2. Recherche

- Saisir une partie du prénom -> filtrage OK.
- Effacer recherche -> liste complète.

## 3. Association

- Cliquer sur "Associer" sur un partenaire non associé.
- Loader spinner sur le bouton.
- Toast succès après réponse.
- Bouton devient grisé + texte "Associé".
- Badge "Associé" visible près du nom.

## 4. Navigation détail

- Taper sur une carte (hors bouton) -> navigation vers /delivery-partners/[id].
- Vérifier affichage image ou initiales, nom complet, badges, infos téléphone/email, disponibilité, véhicule.
- Bouton association désactivé si déjà associé.

## 5. Détail – fallback

- Forcer un ID invalide (modifier URL manuellement) -> écran affiche "Partenaire introuvable".

## 6. Statistiques

- Si backend renvoie `stats`, vérifier sérialisation JSON affichée.
- Sinon message placeholder.

## 7. Refresh

- Pull to refresh dans la liste -> compteurs et badges mis à jour via backend.

## 8. Résilience réseau

- Couper réseau -> chargement affiche toast d'erreur.
- Revenir en ligne -> refresh fonctionne.

## 9. Accessibilité rapide

- Vérifier que les zones tactiles (carte, bouton) répondent correctement (pas de délai >300ms).

## 10. Régression

- Profil entreprise toujours accessible.
- Association multiple du même compte refusée (bouton désactivé).

---
Checklist OK => fonctionnalité prête.
