import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Score {
    playerName: string;
    points: bigint;
}
export interface backendInterface {
    getHighScores(): Promise<Array<Score>>;
    submitScore(playerName: string, points: bigint): Promise<void>;
}
