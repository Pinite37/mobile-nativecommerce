# Migration du système Toast vers ReanimatedToast

## ✅ Changements effectués

### 1. Suppression de l'ancien système Toast
- ❌ **Supprimé** : `components/ui/Toast.tsx` (ancien composant Toast)
- ♻️ **Converti en wrapper** : `components/ui/ToastManager.tsx` (maintenant un wrapper de compatibilité)

### 2. Nettoyage de `_layout.tsx`
- ✅ Suppression de l'import `ToastManager`
- ✅ Suppression du wrapper `<ToastManager>`
- ✅ Conservation uniquement de `ReanimatedToastProvider`

### 3. Wrapper de compatibilité
Le fichier `ToastManager.tsx` a été converti en wrapper léger qui redirige vers ReanimatedToast :

```typescript
// Ancien import (toujours fonctionnel grâce au wrapper)
import { useToast } from './ToastManager';

// Nouvel import (recommandé)
import { useToast } from './ReanimatedToast/context';
```

## 🎯 Utilisation

### API recommandée (ReanimatedToast)

```typescript
import { useToast } from './ReanimatedToast/context';

const MyComponent = () => {
  const { showToast } = useToast();

  const handleSuccess = () => {
    showToast({
      title: 'Succès',
      subtitle: 'Opération réussie',
      autodismiss: true,
    });
  };

  return <Button onPress={handleSuccess} />;
};
```

### API de compatibilité (ToastManager - sera supprimée)

```typescript
import { useToast } from './ToastManager';

const MyComponent = () => {
  const toast = useToast();

  const handleSuccess = () => {
    toast.showSuccess('Succès', 'Opération réussie');
  };

  const handleError = () => {
    toast.showError('Erreur', 'Quelque chose s\'est mal passé');
  };

  return <Button onPress={handleSuccess} />;
};
```

## 📋 Fichiers encore à migrer (optionnel)

Les fichiers suivants utilisent encore l'ancien import via le wrapper. 
Ils fonctionnent correctement mais peuvent être migrés vers l'API ReanimatedToast :

1. `app/(app)/(enterprise)/(tabs)/products/create.tsx`
2. `app/(app)/(enterprise)/delivery-partners/index.tsx`
3. `app/(app)/(client)/profile.tsx`
4. `app/(app)/(enterprise)/profile/settings.tsx`
5. `app/(app)/(client)/profile/settings.tsx`
6. `app/(app)/(enterprise)/settings.tsx`
7. `components/ui/ImagePickerModal.tsx`
8. `app/(app)/(client)/profile/details.tsx`
9. `app/(app)/(enterprise)/delivery-partners/[partnerId].tsx`
10. `app/(app)/(enterprise)/help.tsx`
11. `app/(app)/(enterprise)/profile/help.tsx`
12. `app/(app)/(enterprise)/profile/info.tsx`
13. `app/(app)/(enterprise)/(tabs)/products/[id].tsx`

## 🔄 Guide de migration

### Étape 1 : Changer l'import

```diff
- import { useToast } from '../../../../components/ui/ToastManager';
+ import { useToast } from '../../../../components/ui/ReanimatedToast/context';
```

### Étape 2 : Adapter les appels

```diff
  const toast = useToast();
+ const { showToast } = toast;

  // Méthode showSuccess
- toast.showSuccess('Titre', 'Message');
+ showToast({ title: 'Titre', subtitle: 'Message', autodismiss: true });

  // Méthode showError
- toast.showError('Erreur', 'Message');
+ showToast({ title: 'Erreur', subtitle: 'Message', autodismiss: true });
```

## 🗑️ Prochaines étapes (futures versions)

1. ✅ **Fait** : Supprimer l'ancien composant Toast
2. ✅ **Fait** : Créer un wrapper de compatibilité
3. ⏳ **À faire** : Migrer tous les fichiers vers l'API ReanimatedToast
4. ⏳ **À faire** : Supprimer le wrapper ToastManager.tsx
5. ⏳ **À faire** : Nettoyer tous les anciens imports

## 📝 Notes

- Le wrapper de compatibilité garantit que **aucun code n'est cassé**
- La migration vers ReanimatedToast peut se faire progressivement
- ReanimatedToast offre de meilleures performances grâce à Reanimated 2
- Les toasts s'empilent automatiquement avec des animations fluides
