# Naming cheatsheet (distilled)

Source: naming-cheatsheet by Artem Zakharchenko (kettanaito), MIT License (see ../LICENSE.md).
Examples are JavaScript; the rules apply to any language.

## Seven rules

1. **English.** `firstName`, not `primerNombre`. Code, syntax, and docs are English; mixing breaks cohesion.
2. **One convention.** `camelCase`, `snake_case`, or `PascalCase`, but never mixed. Follow the language's tradition.
3. **S-I-D.** Short (quick to type and remember), Intuitive (reads like speech), Descriptive (says what it does or holds).
   ```js
   const a = 5                       // bad: means anything
   const shouldPaginatize = a > 10   // bad: invented verb
   const postCount = 5               // good
   const shouldPaginate = postCount > 10
   ```
4. **No contractions.** `onItemClick`, not `onItmClk`.
5. **No context duplication.** Inside `class MenuItem`, use `handleClick`, not `handleMenuItemClick`.
6. **Reflect the expected result.** If the consumer takes `disabled`, compute `isDisabled = itemCount <= 3`, not `isEnabled` then `!isEnabled`.
7. **Singular vs plural.** `friend = 'Bob'`; `friends = ['Bob', 'Tony']`.

## Function names: A/HC/LC

```
prefix? + action (A) + high context (HC) + low context? (LC)
```

| Name                   | Prefix   | Action    | High context | Low context |
| ---------------------- | -------- | --------- | ------------ | ----------- |
| `getUser`              |          | `get`     | `User`       |             |
| `getUserMessages`      |          | `get`     | `User`       | `Messages`  |
| `handleClickOutside`   |          | `handle`  | `Click`      | `Outside`   |
| `shouldDisplayMessage` | `should` | `Display` | `Message`    |             |

Context order changes meaning: `shouldUpdateComponent` (you update it) vs `shouldComponentUpdate`
(it updates itself; you only gate when). High context carries the emphasis.

### Actions

| Verb      | Meaning                                                   | Example                                   |
| --------- | --------------------------------------------------------- | ----------------------------------------- |
| `get`     | Access data now; fine for async fetches too               | `getFruitCount()`, `await getUser(id)`    |
| `set`     | Assign a value declaratively                              | `setFruits(5)`                            |
| `reset`   | Restore the initial value                                 | `resetFruits()`                           |
| `remove`  | Take something *out of* somewhere; pairs with `add`       | `removeFilter('price', filters)`          |
| `delete`  | Erase from existence; pairs with `create`                 | `deletePost(id)`                          |
| `compose` | Build new data from existing data                         | `composePageUrl(name, id)`                |
| `handle`  | React to an event; the callback verb                      | `handleLinkClick`                         |

**remove vs delete:** `add` needs a destination, `create` does not. Pair `remove` with `add` and
`delete` with `create`.

### Context

State the domain or data type the function works on: `getRecentPosts(posts)`. Omit it only when
the language makes it obvious (`filter` on arrays, not `filterArray`).

### Prefixes (mostly for variables)

| Prefix          | Use                                              | Example                               |
| --------------- | ------------------------------------------------ | ------------------------------------- |
| `is`            | Characteristic or state (boolean)                | `isBlue`, `isPresent`                 |
| `has`           | Possession (boolean)                             | `hasProducts`, not `isProductsExist`  |
| `should`        | Positive conditional tied to an action (boolean) | `shouldUpdateUrl(url, expected)`      |
| `min` / `max`   | Boundaries                                       | `minPosts`, `maxPosts`                |
| `prev` / `next` | State transitions                                | `prevPosts`, `nextPosts`              |
