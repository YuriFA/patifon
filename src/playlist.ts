import Track from "./track";

export type TrackSource = string | { src: string; name?: string };

export default class Playlist {
  private readonly items: Track[] = [];

  constructor(tracks: TrackSource[] = []) {
    this.addTrackList(tracks);
  }

  get tracks(): readonly Track[] {
    return this.items;
  }

  getTrack(id: number): Track {
    const track = this.items[id];
    if (!track) {
      throw new Error(`Track with id=${id} doesn't exist in playlist`);
    }
    return track;
  }

  addTrack(id: number, src: string, name = ""): this {
    this.items.push(new Track(id, src, name));
    return this;
  }

  addTrackList(list: TrackSource[]): void {
    list.forEach((source, i) => {
      if (typeof source === "string") {
        this.addTrack(i, source);
      } else {
        this.addTrack(i, source.src, source.name);
      }
    });
  }
}
