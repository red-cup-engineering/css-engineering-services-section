import type {
  RenderTufteDocumentOptions,
  TufteModel,
  TufteProjection,
  TufteTile,
  TufteWorkspaceInput,
} from "@red-cup-engineering/web-tufte-gui-services-section";

export interface QwzTufteRoomOptions<Entry = unknown> {
  title?: string;
  subtitle?: string;
  eyebrow?: string;
  revision?: string;
  tick?: number;
  entries?: Iterable<Entry>;
  tileForEntry: (entry: Entry, index: number) => TufteTile | TufteTile[] | null | undefined;
  leadingTiles?: TufteTile[];
  trailingTiles?: TufteTile[];
  mastheadHtml?: string;
  footerHtml?: string;
  workspace?: TufteWorkspaceInput;
}

export function createTufteRoomModel<Entry = unknown>(options: QwzTufteRoomOptions<Entry>): TufteModel;
export function renderTufteRoomDocument<Entry = unknown>(options: QwzTufteRoomOptions<Entry>, renderOptions?: RenderTufteDocumentOptions): string;
export function normalizeTufteRoomProjection<Entry = unknown>(options: QwzTufteRoomOptions<Entry>): TufteProjection;
