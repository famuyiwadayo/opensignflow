/* eslint-disable @typescript-eslint/no-explicit-any */
import { DocumentPdfViewer } from '../document-pdf-viewer';

export function EditorCanvas({
  previewUrl,
  fields,
  headers,
  onSelect,
  onPlace,
  onMoveEnd,
  onResizeEnd,
  onRefresh,
  zoom,
  activeRecipientId,
}: {
  previewUrl: string | null;
  fields: any[];
  headers: Record<string, string>;
  onSelect: (field: any) => void;
  onPlace: (input: { pageNumber: number; x: number; y: number }) => void;
  onMoveEnd: (input: { field: any; x: number; y: number }) => void;
  onResizeEnd: (input: { field: any; width: number; height: number }) => void;
  onRefresh: () => void;
  zoom: number;
  activeRecipientId?: string | null;
}) {
  if (!previewUrl)
    return (
      <div className="grid min-h-[640px] place-items-center rounded-2xl border border-dashed border-slate-700 text-slate-400">
        Preview the PDF to start placing fields.
      </div>
    );
  return (
    <DocumentPdfViewer
      url={previewUrl}
      fields={fields}
      headers={headers}
      onSelect={onSelect}
      onPlace={onPlace}
      onMoveEnd={onMoveEnd}
      onResizeEnd={onResizeEnd}
      onRefresh={onRefresh}
      zoom={zoom}
      activeRecipientId={activeRecipientId}
    />
  );
}
