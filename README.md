# sphere-cloud-modelstore-service

Syncing:
 * ```modelstore.calculateSyncItems(user, modelName, nodeManifest)```
 * ```modelstore.doSyncItems(user, modelName, pushedItems, requestedObjectIds)```
 * ```modelstore.pushItemChange(user, modelName, pushedItem)```

Access:
 * ```modelstore.listItems(user, modelName)```
 * ```modelstore.getItem(user, modelName, objectId)```
 * ```modelstore.updateItem(user, modelName, objectId, data)```
 * ```modelstore.createItem(user, modelName, data)```
 * ```modelstore.deleteItem(user, modelName, objectId)```

# docker

Deployment and local testing is done using docker.

To build an image.

```
make build
```

To test locally.

```
make local
```

To deploy 

```
make deploy
```

To point to a docker in a vm use.

```
export DOCKER_ARGS="-H crusty.local:5555"
