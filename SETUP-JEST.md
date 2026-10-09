# Démarrer un projet et écrire son premier test unitaire avec Jest

Ce guide part d’un dossier vide. Vous allez créer un projet Node.js, installer Jest, écrire une fonction simple et construire ses tests unitaires pendant le live coding.

**Prérequis :** Node.js 20 ou plus récent, npm et un éditeur de code. **Durée indicative :** 30 à 45 minutes.

## 1. Vérifier Node.js et npm

Ouvrir un terminal dans le dossier de ce projet :

```bash
node --version
npm --version
```

Les deux commandes doivent afficher une version. Si une commande est introuvable, installer Node.js et rouvrir le terminal avant de continuer.

Toutes les commandes suivantes s’exécutent à la racine du projet.

## 2. Initialiser le projet Node.js

```bash
npm init -y
```

Cette commande crée `package.json`. Ce fichier décrit le projet, ses dépendances et les commandes disponibles.

Nous utiliserons **CommonJS** : `module.exports` pour exporter une fonction et `require` pour l’importer. Garder le projet sans propriété `"type": "module"` pour cette séance.

## 3. Installer Jest

```bash
npm install --save-dev jest
```

Jest devient une dépendance de développement dans `package.json`. L’installation crée aussi :

- `node_modules/`, contenant les dépendances installées ;
- `package-lock.json`, enregistrant les versions résolues pour reproduire l’installation.

Jest fournit l’exécution des tests et les assertions. Pour ce premier exercice, aucune configuration supplémentaire n’est nécessaire. [Documentation officielle de démarrage Jest](https://jestjs.io/docs/getting-started).

## 4. Préparer les commandes de test

Configurer les scripts avec npm :

```bash
npm pkg set 'scripts.test=jest'
npm pkg set 'scripts.test:watch=jest --watchAll'
npm pkg set 'scripts.test:coverage=jest --coverage'
```

Dans `package.json`, la section `scripts` doit maintenant contenir :

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watchAll",
    "test:coverage": "jest --coverage"
  }
}
```

Ce bloc montre uniquement la section à vérifier : ne pas remplacer tout le fichier `package.json` par cet extrait.

Lancer :

```bash
npm test
```

À ce stade, Jest indique **No tests found** et termine avec un code d’échec. C’est attendu : aucun fichier de test n’a encore été créé.

## 5. Préparer les dossiers

```bash
mkdir -p src tests
```

Créer aussi un fichier `.gitignore` à la racine :

```gitignore
node_modules/
coverage/
```

Les sources et les tests seront versionnés, ainsi que `package.json` et `package-lock.json`. Les dépendances et les rapports de couverture sont générés localement.

La structure que nous allons construire :

```text
projet/
├── src/
│   └── calculateTotal.js
├── tests/
│   └── calculateTotal.test.js
├── .gitignore
├── package.json
└── package-lock.json
```

## 6. Définir le comportement avant d’écrire le code

Nous allons calculer le total d’une commande à partir d’un prix unitaire et d’une quantité.

| Prix unitaire | Quantité | Total attendu |
| --- | --- | --- |
| 25 | 4 | 100 |
| 25 | 0 | 0 |
| 25 | 1 | 25 |

Pour commencer, les entrées sont des nombres valides. La validation sera ajoutée dans une extension.

Un **test unitaire** vérifie un comportement précis d’une fonction. Ici, le calcul ne nécessite ni serveur, ni base de données, ni requête HTTP.

## 7. Écrire le premier test

Créer `tests/calculateTotal.test.js` :

```js
const calculateTotal = require('../src/calculateTotal');

test('calcule le total pour quatre articles à 25', () => {
  // Arrange : préparer les données.
  const unitPrice = 25;
  const quantity = 4;

  // Act : exécuter la fonction.
  const result = calculateTotal(unitPrice, quantity);

  // Assert : comparer le résultat au résultat attendu.
  expect(result).toBe(100);
});
```

Comprendre les trois éléments :

- `test(description, fonction)` déclare un scénario avec un nom lisible.
- `expect(result)` désigne la valeur observée.
- `.toBe(100)` vérifie qu’elle vaut exactement le nombre attendu.

Le nom `calculateTotal.test.js` permet à Jest de découvrir le fichier automatiquement.

Lancer `npm test`. Le test échoue avec **Cannot find module** : le fichier de la fonction n’existe pas encore.

## 8. Créer la fonction et observer un test rouge

Créer `src/calculateTotal.js` avec une implémentation provisoire :

```js
function calculateTotal(unitPrice, quantity) {
  return 0;
}

module.exports = calculateTotal;
```

Relancer :

```bash
npm test
```

Cette fois, le module est trouvé, mais l’assertion échoue :

```text
Expected: 100
Received: 0
```

Le test s’exécute réellement et détecte le mauvais calcul. Lire cette différence avant de modifier la fonction.

## 9. Implémenter le calcul et obtenir un test vert

Remplacer le contenu de `src/calculateTotal.js` par :

```js
function calculateTotal(unitPrice, quantity) {
  return unitPrice * quantity;
}

module.exports = calculateTotal;
```

Relancer `npm test`. Le test doit passer :

```text
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

Nous venons de suivre le cycle : **écrire le test → observer l’échec → implémenter → vérifier**.

## 10. Ajouter des cas et organiser la suite

Remplacer `tests/calculateTotal.test.js` par cette suite, qui conserve le premier scénario et ajoute les deux autres :

```js
const calculateTotal = require('../src/calculateTotal');

describe('calculateTotal', () => {
  test('calcule le total pour plusieurs articles', () => {
    expect(calculateTotal(25, 4)).toBe(100);
  });

  test('retourne zéro lorsque la quantité est nulle', () => {
    expect(calculateTotal(25, 0)).toBe(0);
  });

  test('retourne le prix unitaire pour un seul article', () => {
    expect(calculateTotal(25, 1)).toBe(25);
  });
});
```

`describe` regroupe des tests liés à une même fonction. Chaque `test` reste indépendant et vérifie un comportement identifiable.

Lancer `npm test` : les trois tests doivent passer. Les nombres attendus sont écrits explicitement ; ils ne sont pas recalculés avec la même formule que l’implémentation.

## 11. Travailler en mode watch

```bash
npm run test:watch
```

Jest relance les tests après les modifications. Pour observer ce mécanisme :

1. Remplacer temporairement la multiplication par une addition dans la fonction.
2. Sauvegarder et observer les tests qui échouent.
3. Rétablir la multiplication et sauvegarder.
4. Vérifier que les tests repassent au vert.

Quitter le mode watch avec `Ctrl+C`.

## 12. Exercice : tester une erreur

Ajouter une règle : **une quantité négative doit provoquer une erreur**.

Dans le `describe` existant, écrire d’abord :

```js
test('refuse une quantité négative', () => {
  expect(() => calculateTotal(25, -1))
    .toThrow('La quantité doit être positive ou nulle');
});
```

Lancer le test : il échoue tant que la fonction ne vérifie pas la quantité. Compléter ensuite `calculateTotal` pour lever une `Error` avec ce message si `quantity < 0`, tout en conservant le calcul pour les autres cas.

Pour tester une exception, transmettre à `expect` une **fonction qui exécutera l’appel**. Écrire `expect(calculateTotal(25, -1))` exécuterait l’appel trop tôt et laisserait l’erreur sortir avant l’assertion `toThrow`.

## 13. Consulter la couverture

```bash
npm run test:coverage
```

Jest affiche un tableau et produit un rapport dans `coverage/`. La couverture montre les lignes et les branches exécutées par les tests.

Après avoir ajouté la validation, vérifier les deux chemins : quantité négative et quantité autorisée. Même une couverture de 100 % ne garantit pas que les assertions sont correctes ou que toutes les règles métier sont testées.

## 14. Résoudre les erreurs fréquentes

| Message ou problème | Vérification à effectuer |
| --- | --- |
| `jest: not found` | Installer les dépendances avec `npm install` |
| `No tests found` | Créer un fichier portant le suffixe `.test.js` |
| `Cannot find module` | Vérifier le chemin dans `require` et le nom du fichier source |
| `calculateTotal is not a function` | Vérifier `module.exports = calculateTotal` |
| `require is not defined` | Vérifier que le projet utilise CommonJS |
| `Expected` différent de `Received` | Comparer le comportement attendu au résultat de la fonction |

## 15. Vérifier les acquis

La première étape est terminée quand vous savez :

- Initialiser un projet avec `npm init -y` et installer Jest en développement.
- Configurer `npm test` et créer un fichier `.test.js`.
- Exporter une fonction, l’importer dans le test et écrire une assertion.
- Distinguer préparation, exécution et vérification.
- Lire un échec, corriger le code et relancer les tests.
- Ajouter plusieurs cas et tester une exception avec `toThrow`.

La séance suivante pourra appliquer cette méthode à une classe d’erreur et à un middleware Express, en introduisant les doubles `req`, `res` et `next` avec `jest.fn()`.
