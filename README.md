Internal Model Store RPC
========================

Syncing:
 * ```modelstore.calculateSyncItems(user, modelName, nodeManifest)```
 * ```modelstore.doSyncItems(user, modelName, pushedItems, requestedObjectIds)```
 * ```modelstore.pushItemChange(user, modelName, pushedItem)```

Access:
 * ```modelstore.listItems(user, modelName)```
 * ```modelstore.getItem(user, modelName, objectId)```