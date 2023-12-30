import { EntityName } from "@ourworldindata/types"
import { MapTopology } from "./MapTopology"

let _cache: Set<string>
export const isOnTheMap = (entityName: EntityName): boolean => {
    // Cache the result
    if (!_cache)
        _cache = new Set(
            MapTopology.objects.world.geometries.map((region: any) => region.id)
        )
    return _cache.has(entityName)
}
