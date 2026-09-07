/**
 * A playlist entry: plain track metadata. Playback state lives entirely in
 * AudioPlayer, which owns a single HTMLAudioElement for the whole playlist.
 */
export default class Track {
  readonly id: number;
  readonly src: string;
  readonly name: string;

  constructor(id: number, src: string, name = "") {
    this.id = id;
    this.src = src;
    this.name = name;
  }
}
