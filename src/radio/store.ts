import { idbDelete, idbGetAll, idbPut } from "../utils/idb";
import type { RadioStation } from "./api";

const STORE_STATIONS = "stations";

export function loadSavedStations(): Promise<RadioStation[]> {
  return idbGetAll<RadioStation>(STORE_STATIONS);
}

export function saveStation(station: RadioStation): Promise<void> {
  return idbPut(STORE_STATIONS, station);
}

export function deleteStation(stationuuid: string): Promise<void> {
  return idbDelete(STORE_STATIONS, stationuuid);
}
