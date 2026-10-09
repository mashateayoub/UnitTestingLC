# Tester un service d’une API Express avec Jest et mesurer la couverture

Cette séance prolonge [la mise en place de Jest](SETUP-JEST.md). Nous allons tester le service chargé de rechercher un utilisateur dans une API Express : succès, entrée invalide, utilisateur absent et incident de stockage. Ensuite, nous utiliserons la couverture pour repérer les chemins oubliés.

**Durée indicative :** 45 à 60 minutes. **Outils :** Node.js, Express pour la démonstration de l’API et Jest pour tous les tests.

Les blocs de ce document sont à écrire pendant le live coding. Ce guide ne crée pas les fichiers applicatifs à votre place.

## 1. Préparer le projet existant

Les exemples utilisent `require` et `module.exports`, comme le premier guide. Si `package.json` contient `"type": "module"`, aligner le projet sur CommonJS :

```bash
npm pkg set type=commonjs
```

Vérifier ensuite les tests de la première séance :

```bash
npm test
```

Créer les dossiers de cette nouvelle séance :

```bash
mkdir -p src/services tests/unit
```

Les fichiers à ajouter progressivement :

```text
src/
  calculateTotal.js                Exercice précédent conservé
  services/
    userService.js                Service à implémenter
tests/
  calculateTotal.test.js           Tests précédents conservés
  unit/
    userService.test.js            Nouvelle suite unitaire
jest.config.cjs                    Configuration de couverture à ajouter
```

## 2. Identifier l’unité que nous testons

Dans une API, la recherche d’un utilisateur peut suivre ce parcours :

```text
GET /api/users/:id
        ↓
Contrôleur Express : lit req.params.id
        ↓
Service : valide l’ID et décide si l’utilisateur existe
        ↓
Repository : recherche dans la source de données
```

Le **service** porte la règle métier. Le **repository** représente l’accès aux données : mémoire, MongoDB ou autre stockage.

Dans nos tests, nous appelons le vrai service et simulons uniquement le repository avec `jest.fn()`. Cela permet de tester les décisions du service sans connexion à une base de données.

Ne pas simuler `getUserById` lui-même dans sa propre suite : cela vérifierait uniquement le comportement du mock. Les tests de service n’ont pas besoin d’objets Express `req`, `res`, `next` ni de serveur HTTP.

## 3. Définir le contrat du service

Le service expose une méthode asynchrone `getUserById(id)`.

| Situation | Comportement attendu |
| --- | --- |
| ID de type string, non vide | Appeler `repository.findById` une seule fois avec l’ID nettoyé |
| Utilisateur trouvé | Retourner l’utilisateur obtenu du repository |
| ID absent, vide ou d’un autre type | Rejeter avec une erreur portant `statusCode: 400`, sans appeler le repository |
| Repository retournant `null` | Rejeter avec une erreur portant `statusCode: 404` |
| Repository rejetant une erreur | Propager le même objet erreur |

Les erreurs 400 et 404 sont des cas prévus. Leur propriété `statusCode` sera utilisée par la couche HTTP. Le service ne choisit pas lui-même une réponse Express.

Pour fournir un repository différent selon le contexte, nous utiliserons une fonction `createUserService(repository)`. En application, elle reçoit le vrai accès aux données ; en test, elle reçoit un objet simulé. C’est une forme simple d’injection de dépendance.

## 4. Créer un service provisoire

Créer `src/services/userService.js` :

```js
function createUserService(repository) {
  return {
    async getUserById(id) {
      return null;
    }
  };
}

module.exports = createUserService;
```

Cette version permet d’importer et d’appeler le service. Elle ne respecte pas encore le contrat : les tests vont guider son implémentation.

## 5. Écrire le premier test : utilisateur trouvé

Créer `tests/unit/userService.test.js` :

```js
const createUserService = require('../../src/services/userService');

describe('userService.getUserById', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = { findById: jest.fn() };
    service = createUserService(repository);
  });

  test('retourne l’utilisateur trouvé et appelle le repository une fois', async () => {
    // Arrange
    const user = { id: '42', name: 'Sara' };
    repository.findById.mockResolvedValue(user);

    // Act
    const result = await service.getUserById('42');

    // Assert
    expect(result).toEqual(user);
    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(repository.findById).toHaveBeenCalledWith('42');
  });
});
```

Exécuter cette suite :

```bash
npm test -- userService
```

Elle doit échouer : le service retourne `null`. Modifier uniquement `getUserById` pour appeler le repository et retourner l’utilisateur :

```js
async getUserById(id) {
  const user = await repository.findById(id);
  return user;
}
```

Ce bloc remplace la méthode dans l’objet existant ; il ne remplace pas tout le fichier. Relancer le test pour obtenir un premier résultat vert.

`mockResolvedValue(user)` simule une promesse réussie. `await` permet d’attendre la réponse du service avant les assertions. `beforeEach` crée un repository neuf pour chaque test : ni historique des appels ni comportement simulé n’est partagé.

## 6. Tester les IDs invalides

Ajouter ce bloc **dans le même `describe`**, après le premier test :

```js
test.each([undefined, null, '', '   ', 42])(
  'refuse l’ID invalide %p sans appeler le repository', async (id) => {
    await expect(service.getUserById(id)).rejects.toMatchObject({
      message: 'Identifiant utilisateur requis',
      statusCode: 400
    });

    expect(repository.findById).not.toHaveBeenCalled();
  }
);
```

`test.each` crée cinq tests à partir de cinq entrées. Le contrat de cet exercice exige une string : le nombre `42` est volontairement refusé, car un paramètre de route Express est reçu sous forme de string.

Lancer la suite, constater l’échec, puis ajouter la validation au début de la méthode. Le service doit rejeter les entrées invalides **avant** d’accéder aux données.

Une erreur métier peut être construite ici avec une `Error` native et une propriété :

```js
const error = new Error('Identifiant utilisateur requis');
error.statusCode = 400;
throw error;
```

Cette méthode est asynchrone : un `throw` provoque une promesse rejetée. Utiliser `await expect(...).rejects`, et non `expect(() => ...).toThrow`, pour observer ce rejet.

## 7. Tester le nettoyage de l’ID

Toujours dans le même `describe` :

```js
test('retire les espaces autour de l’ID avant la recherche', async () => {
  const user = { id: '42', name: 'Sara' };
  repository.findById.mockResolvedValue(user);

  const result = await service.getUserById(' 42 ');

  expect(result).toEqual(user);
  expect(repository.findById).toHaveBeenCalledTimes(1);
  expect(repository.findById).toHaveBeenCalledWith('42');
});
```

Ce test peut échouer même si les validations précédentes passent. Compléter le service pour transmettre au repository `id.trim()`.

## 8. Tester l’utilisateur absent

Ajouter :

```js
test('rejette avec une erreur 404 lorsque l’utilisateur est absent', async () => {
  repository.findById.mockResolvedValue(null);

  await expect(service.getUserById('999')).rejects.toMatchObject({
    message: 'Utilisateur introuvable',
    statusCode: 404
  });

  expect(repository.findById).toHaveBeenCalledTimes(1);
  expect(repository.findById).toHaveBeenCalledWith('999');
});
```

Le repository réussit sa recherche, mais ne trouve rien. Le service transforme cette absence en erreur métier. Compléter la méthode pour distinguer ce cas du succès.

## 9. Tester un incident du repository

Ajouter :

```js
test('propage exactement l’erreur rejetée par le repository', async () => {
  const storageError = new Error('Stockage indisponible');
  repository.findById.mockRejectedValue(storageError);

  await expect(service.getUserById('42')).rejects.toBe(storageError);

  expect(repository.findById).toHaveBeenCalledTimes(1);
  expect(repository.findById).toHaveBeenCalledWith('42');
});
```

`mockRejectedValue` simule un incident asynchrone. `toBe(storageError)` vérifie l’identité de l’objet, et pas seulement son message. Le service ne doit pas convertir cet incident en erreur 404 ni le masquer en retournant `null`.

Ce test peut déjà passer grâce au `await` du repository : un test utile n’a pas besoin d’échouer à chaque ajout.

## 10. Vérifier l’implémentation finale

Après avoir construit les tests, comparer le service à cette version :

```js
function createUserService(repository) {
  return {
    async getUserById(id) {
      if (typeof id !== 'string' || id.trim() === '') {
        const error = new Error('Identifiant utilisateur requis');
        error.statusCode = 400;
        throw error;
      }

      const user = await repository.findById(id.trim());

      if (!user) {
        const error = new Error('Utilisateur introuvable');
        error.statusCode = 404;
        throw error;
      }

      return user;
    }
  };
}

module.exports = createUserService;
```

Lancer :

```bash
npm test -- userService
npm test
```

La nouvelle suite contient **neuf tests** : un succès, cinq IDs invalides, un nettoyage d’ID, une absence et un incident de stockage. La seconde commande vérifie aussi que les tests de la première séance fonctionnent toujours.

## 11. Relier le service à une API Express

Cette étape permet de situer le service dans l’application. Elle est facultative pour les tests unitaires.

Installer Express :

```bash
npm install express
```

Créer `src/server.js` :

```js
const express = require('express');
const createUserService = require('./services/userService');

const app = express();
const users = [{ id: '42', name: 'Sara' }];

// Adaptateur en mémoire pour la démonstration, sans base de données externe.
const repository = {
  async findById(id) {
    return users.find(user => user.id === id) || null;
  }
};
const service = createUserService(repository);

app.get('/api/users/:id', async (req, res, next) => {
  try {
    const user = await service.getUserById(req.params.id);
    res.status(200).json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 ? 'Erreur interne' : error.message;
  res.status(statusCode).json({ message });
});

app.listen(3000, () => console.log('API : http://localhost:3000'));
```

Démarrer avec `node src/server.js`, puis utiliser un autre terminal :

```bash
curl -i http://localhost:3000/api/users/42
curl -i http://localhost:3000/api/users/999
```

Les résultats attendus sont 200 puis 404. Arrêter le serveur avec `Ctrl+C`.

Ces appels servent à observer l’application complète. La suite unitaire importe uniquement `userService.js`, jamais `server.js` : elle reste indépendante du serveur et ne vérifie pas le statut HTTP de la route.

## 12. Configurer une couverture centrée sur les services

Créer `jest.config.cjs` à la racine :

```js
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: ['src/services/**/*.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov']
};
```

Si une configuration Jest existe déjà, intégrer ces options dans cette configuration plutôt que d’en créer une seconde.

`collectCoverageFrom` définit les fichiers à mesurer, y compris les services jamais importés par un test. Les anciens tests de calcul restent exécutés, mais leur code ne figure pas dans ce rapport centré sur les services. [Configuration de couverture Jest](https://jestjs.io/docs/configuration#collectcoveragefrom-array).

Vérifier que le script de la première séance est présent :

```bash
npm pkg set 'scripts.test:coverage=jest --coverage'
npm run test:coverage
```

Pour exécuter seulement cette suite avec la couverture :

```bash
npm run test:coverage -- userService
```

La sélection des tests ne change pas la liste des fichiers ciblés par `collectCoverageFrom`. Si d’autres services sont ajoutés, ils peuvent donc apparaître non couverts dans ce lancement ciblé. [Options de ligne de commande Jest](https://jestjs.io/docs/cli#--coverageboolean).

## 13. Lire les indicateurs de couverture

| Colonne | Ce qu’elle mesure | Question à poser |
| --- | --- | --- |
| `% Stmts` | Instructions exécutées | Les instructions de validation et de retour ont-elles été exécutées ? |
| `% Branch` | Branches exécutées | A-t-on testé les chemins vrai et faux des conditions ? |
| `% Funcs` | Fonctions appelées | La méthode du service a-t-elle réellement été appelée ? |
| `% Lines` | Lignes exécutées | Quelles lignes n’ont jamais été parcourues ? |
| `Uncovered Line #s` | Numéros des lignes non couvertes | Quel scénario métier manque pour les atteindre ? |

Ouvrir **`coverage/index.html`** dans le navigateur. Ce chemin correspond au reporter `html` choisi ici. Le rapport permet d’examiner les lignes et les branches manquantes du service.

Un test sur un utilisateur trouvé peut appeler la méthode et couvrir plusieurs lignes tout en laissant les chemins 400 et 404 non couverts. Ajouter des assertions sur ces comportements apporte une vérification que le seul pourcentage ne donne pas.

## 14. Utiliser la couverture pour trouver un scénario oublié

Faire une courte expérience après avoir obtenu une suite verte :

1. Remplacer temporairement le test « utilisateur absent » par `test.skip`.
2. Relancer `npm run test:coverage -- userService`.
3. Observer les lignes de construction de l’erreur 404 et la branche manquante.
4. Rétablir `test`, puis relancer la couverture.

La suite peut rester verte malgré un scénario ignoré. Le rapport aide à voir que le chemin n’a plus été exécuté.

Même avec 100 % de couverture, certaines règles peuvent manquer. Par exemple, retirer le `.trim()` transmis au repository pourrait laisser les chemins couverts tout en cassant la normalisation : c’est l’assertion sur l’argument `'42'` qui détecte cette régression.

## 15. Ajouter un seuil de couverture, après les premiers tests

Pour cet exercice, ajouter cette propriété à la configuration existante :

```js
coverageThreshold: {
  global: {
    statements: 90,
    branches: 90,
    functions: 100,
    lines: 90
  }
}
```

Ce bloc est une propriété à insérer dans l’objet `module.exports`, avec la virgule nécessaire après la propriété précédente. Il ne remplace pas tout le fichier.

Les seuils concernent ici les services ciblés par `collectCoverageFrom`. Lors d’un lancement avec couverture, Jest échoue si un seuil n’est pas atteint, même si les assertions passent. Ces valeurs servent d’exercice et doivent être adaptées aux règles importantes du projet. [Seuils de couverture Jest](https://jestjs.io/docs/configuration#coveragethreshold-object).

## 16. Vérifier les acquis

À la fin de la séance, vous devez pouvoir :

- Appeler le vrai service dans les tests et simuler son accès aux données.
- Créer un mock neuf dans `beforeEach` pour isoler chaque scénario.
- Attendre un succès et vérifier un rejet asynchrone avec `rejects`.
- Vérifier le résultat, les arguments du repository et son nombre d’appels.
- Distinguer absence d’utilisateur et incident de stockage.
- Inclure les services non testés dans la mesure de couverture.
- Lire les branches manquantes et écrire un test sur leur comportement.

Pour prolonger le live coding, ajouter une règle à la fois : format d’ID autorisé, utilisateur désactivé ou création d’un utilisateur avec email unique. Définir les entrées et le résultat attendu avant de modifier le service.
